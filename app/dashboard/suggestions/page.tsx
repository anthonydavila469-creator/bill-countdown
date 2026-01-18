'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SuggestionCard } from '@/components/suggestion-card';
import { AddBillModal } from '@/components/add-bill-modal';
import { BillSuggestion, Bill, BillFormData, categoryEmojis } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import {
  Zap,
  LayoutGrid,
  Calendar,
  History,
  Lightbulb,
  Settings,
  LogOut,
  Mail,
  Search,
  Loader2,
  Inbox,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SuggestionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { showPaidToast } = useToast();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Gmail connection state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<BillSuggestion[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<BillSuggestion | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Check authentication and Gmail status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Check Gmail connection status
      try {
        const response = await fetch('/api/gmail/sync');
        if (response.ok) {
          const data = await response.json();
          setGmailConnected(data.connected);
          setGmailEmail(data.email || null);
        }
      } catch (error) {
        console.error('Failed to check Gmail status:', error);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Scan for bill suggestions
  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxResults: 200, daysBack: 90 }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.code === 'GMAIL_NOT_CONNECTED') {
          setScanError('Gmail is not connected. Please connect Gmail in Settings.');
        } else if (data.code === 'TOKEN_REFRESH_FAILED') {
          setScanError('Gmail access expired. Please reconnect Gmail in Settings.');
        } else {
          setScanError(data.error || 'Failed to scan emails');
        }
        return;
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
      setHasScanned(true);
    } catch (error) {
      console.error('Scan error:', error);
      setScanError('Failed to scan emails. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  // Add suggestion as bill (quick add with defaults)
  const handleAddSuggestion = (suggestion: BillSuggestion) => {
    setSelectedSuggestion(suggestion);
    setIsEditMode(false);
    setIsAddModalOpen(true);
  };

  // Edit and add suggestion
  const handleEditAndAdd = (suggestion: BillSuggestion) => {
    setSelectedSuggestion(suggestion);
    setIsEditMode(true);
    setIsAddModalOpen(true);
  };

  // Ignore suggestion
  const handleIgnore = async (suggestion: BillSuggestion) => {
    try {
      const response = await fetch('/api/suggestions/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmail_message_id: suggestion.gmail_message_id }),
      });

      if (response.ok) {
        // Remove from local state
        setSuggestions((prev) =>
          prev.filter((s) => s.gmail_message_id !== suggestion.gmail_message_id)
        );
      }
    } catch (error) {
      console.error('Failed to ignore suggestion:', error);
    }
  };

  // Handle bill added successfully
  const handleBillSuccess = (bill: Bill) => {
    // Remove the suggestion from the list
    if (selectedSuggestion) {
      setSuggestions((prev) =>
        prev.filter((s) => s.gmail_message_id !== selectedSuggestion.gmail_message_id)
      );
    }
    setSelectedSuggestion(null);
    setIsAddModalOpen(false);

    // Show success toast
    showPaidToast(
      bill.name,
      bill.amount,
      () => {} // No undo action needed
    );
  };

  // Build initial data for the add modal
  const getInitialData = (): Partial<BillFormData> | undefined => {
    if (!selectedSuggestion) return undefined;

    const emoji = selectedSuggestion.category_guess
      ? categoryEmojis[selectedSuggestion.category_guess]
      : '📧';

    return {
      name: selectedSuggestion.name_guess,
      amount: selectedSuggestion.amount_guess,
      due_date: selectedSuggestion.due_date_guess || '',
      category: selectedSuggestion.category_guess,
      emoji,
      is_recurring: false,
      recurrence_interval: null,
      recurrence_day_of_month: null,
      recurrence_weekday: null,
      notes: null,
      payment_url: selectedSuggestion.payment_url || null,
      is_autopay: false,
      is_variable: false,
      typical_min: null,
      typical_max: null,
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0c0c10] border-r border-white/5 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Bill<span className="text-blue-400">Countdown</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <LayoutGrid className="w-5 h-5" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/suggestions"
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <Mail className="w-5 h-5" />
                Suggestions
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/calendar"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Calendar
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/history"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <History className="w-5 h-5" />
                History
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/insights"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Lightbulb className="w-5 h-5" />
                Insights
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-medium">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Back button (mobile) */}
            <Link
              href="/dashboard"
              className="lg:hidden flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Title */}
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Bill Suggestions</h1>
              {gmailConnected && gmailEmail && (
                <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  {gmailEmail}
                </span>
              )}
            </div>

            {/* Scan button */}
            <button
              onClick={handleScan}
              disabled={isScanning || !gmailConnected}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all',
                gmailConnected
                  ? 'bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/10 text-zinc-400 cursor-not-allowed'
              )}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan for Bills
                </>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Error state */}
          {scanError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">{scanError}</p>
                {scanError.includes('Settings') && (
                  <Link
                    href="/dashboard/settings"
                    className="text-sm text-red-400/70 hover:text-red-400 underline mt-1 inline-block"
                  >
                    Go to Settings
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Gmail not connected state */}
          {!gmailConnected && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-6">
                <Mail className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Connect Gmail to Find Bills
              </h2>
              <p className="text-zinc-400 text-center max-w-md mb-6">
                Link your Gmail account to automatically scan your inbox for bill
                emails and create bills with one click.
              </p>
              <Link
                href="/dashboard/settings"
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                  'bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400',
                  'text-white shadow-lg shadow-blue-500/20'
                )}
              >
                <Settings className="w-5 h-5" />
                Connect Gmail in Settings
              </Link>
            </div>
          )}

          {/* Empty state - no scan yet */}
          {gmailConnected && !hasScanned && suggestions.length === 0 && !isScanning && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Ready to Scan
              </h2>
              <p className="text-zinc-400 text-center max-w-md mb-6">
                Click "Scan for Bills" to search your recent emails for bills,
                invoices, and payment reminders.
              </p>
              <button
                onClick={handleScan}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
                  'bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400',
                  'text-white shadow-lg shadow-blue-500/20'
                )}
              >
                <Search className="w-5 h-5" />
                Scan for Bills
              </button>
            </div>
          )}

          {/* Scanning state */}
          {isScanning && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-6 animate-pulse">
                <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Scanning Your Inbox
              </h2>
              <p className="text-zinc-400 text-center max-w-md">
                Looking for bills, invoices, and payment reminders in your
                recent emails...
              </p>
            </div>
          )}

          {/* Empty state - scanned but no suggestions */}
          {gmailConnected && hasScanned && suggestions.length === 0 && !isScanning && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6">
                <Inbox className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                No New Bills Found
              </h2>
              <p className="text-zinc-400 text-center max-w-md mb-6">
                We didn't find any new bill emails in the last 30 days. You're all
                caught up!
              </p>
              <button
                onClick={handleScan}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-white transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Scan Again
              </button>
            </div>
          )}

          {/* Suggestions list */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-zinc-400">
                  Found {suggestions.length} potential bill{suggestions.length !== 1 ? 's' : ''}
                </p>
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  <RefreshCw className={cn('w-4 h-4', isScanning && 'animate-spin')} />
                  Rescan
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {suggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.gmail_message_id}
                    suggestion={suggestion}
                    onAdd={handleAddSuggestion}
                    onEditAndAdd={handleEditAndAdd}
                    onIgnore={handleIgnore}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Bill Modal */}
      <AddBillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSuggestion(null);
        }}
        onSuccess={handleBillSuccess}
        initialData={getInitialData()}
        gmailMessageId={selectedSuggestion?.gmail_message_id}
      />
    </div>
  );
}
