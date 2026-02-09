'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Zap,
  LayoutGrid,
  Calendar,
  History,
  Settings,
  LogOut,
  Mail,
  Shield,
  User,
  Check,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Loader2,
  Trash2,
  ExternalLink,
  Lightbulb,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BillImportModal } from '@/components/bill-import-modal';
import { CustomizationSection } from '@/components/settings/customization-section';
import { NotificationSection } from '@/components/settings/notification-section';
import { SubscriptionSection } from '@/components/settings/subscription-section';
import { WidgetSection } from '@/components/settings/widget-section';
import { DeleteAccountModal } from '@/components/settings/delete-account-modal';
import { ParsedBill } from '@/types';
import { useBillsContext } from '@/contexts/bills-context';
import { useSubscription } from '@/hooks/use-subscription';

// Premium section header component - matches CustomizationSection
function SectionHeader({
  icon: Icon,
  iconGradient,
  title,
  description,
  action,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconGradient: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  index?: number;
}) {
  return (
    <div
      className="flex items-center justify-between mb-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4">
        <div className={cn('relative p-3 rounded-2xl bg-gradient-to-br', iconGradient)}>
          <Icon className="w-5 h-5 text-white relative z-10" />
          <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br blur-xl opacity-40', iconGradient)} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// Premium toggle switch - matches CustomizationSection
function PremiumToggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={cn(
        'relative w-14 h-8 rounded-full transition-all duration-300',
        !enabled && 'bg-white/10',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      style={enabled ? { backgroundColor: 'var(--accent-primary)' } : undefined}
    >
      {/* Track glow when active */}
      {enabled && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-50"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        />
      )}
      {/* Thumb */}
      <div
        className={cn(
          'absolute top-1 w-6 h-6 rounded-full transition-all duration-300',
          'bg-white shadow-lg',
          enabled ? 'left-7' : 'left-1'
        )}
      >
        {/* Thumb highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-zinc-200" />
      </div>
    </button>
  );
}

// Premium toggle field row
function ToggleRow({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  index?: number;
}) {
  return (
    <div
      className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <div>
          <p className="font-medium text-white tracking-wide">{label}</p>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <PremiumToggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

// Premium select field row
function SelectRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  options,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  index?: number;
}) {
  return (
    <div
      className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <div>
          <p className="font-medium text-white tracking-wide">{label}</p>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'appearance-none pl-4 pr-10 py-2.5 min-w-[160px]',
            'bg-white/[0.04] hover:bg-white/[0.08]',
            'border border-white/[0.08] hover:border-white/[0.15]',
            'rounded-xl text-white text-sm font-medium tracking-wide',
            'focus:outline-none focus:ring-2 focus:ring-white/20',
            'cursor-pointer transition-all duration-200'
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  );
}

// Google icon SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { refetch } = useBillsContext();
  const { isPro, canUseCalendar, canUseHistory } = useSubscription();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isForceRescanning, setIsForceRescanning] = useState(false);
  const [showForceRescanConfirm, setShowForceRescanConfirm] = useState(false);

  // Check authentication and Gmail connection status
  useEffect(() => {
    const checkAuth = async () => {
      // Check URL param for gmail=connected (set by OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const gmailJustConnected = urlParams.get('gmail') === 'connected';

      // If URL says we just connected, set state immediately for instant UI feedback
      if (gmailJustConnected) {
        setIsGmailConnected(true);
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Check if Gmail is connected from database
      const { data: gmailToken } = await supabase
        .from('gmail_tokens')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Set connected if we have a token OR if URL param says connected
      setIsGmailConnected(!!gmailToken || gmailJustConnected);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth, supabase]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Gmail handlers
  const handleConnectGmail = () => {
    // Redirect to Gmail OAuth
    window.location.href = '/api/gmail/connect';
  };

  const handleDisconnectGmail = async () => {
    try {
      await fetch('/api/gmail/disconnect', { method: 'POST' });
      setIsGmailConnected(false);
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error);
    }
  };

  const handleImportBills = async (bills: ParsedBill[]) => {
    try {

      const response = await fetch('/api/bills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bills }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Import failed:', result);
        throw new Error(result.error || 'Failed to import bills');
      }


      // Refetch bills to update the context before navigating
      await refetch();

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to import bills:', error);
      throw error; // Re-throw so the modal can show the error
    }
  };

  // Handle delete account
  const handleDeleteAccount = async () => {
    const response = await fetch('/api/account/delete', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete account');
    }

    // Sign out and redirect to home
    await supabase.auth.signOut();
    router.push('/');
  };

  // Handle force rescan
  const handleForceRescan = async () => {
    setIsForceRescanning(true);
    setShowForceRescanConfirm(false);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRescan: true, skipAI: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to rescan emails');
      }

      const result = await response.json();

      // If we got suggestions, open the import modal
      if (result.suggestions && result.suggestions.length > 0) {
        setIsImportModalOpen(true);
      }
    } catch (error) {
      console.error('Force rescan failed:', error);
    } finally {
      setIsForceRescanning(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0c0c10] border-r border-white/5 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo-128.png"
              alt="Duezo"
              width={36}
              height={36}
              className="rounded-xl shadow-lg shadow-orange-500/20"
            />
            <span className="text-lg font-bold text-white tracking-tight">
              Due<span className="text-orange-400">zo</span>
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
                href="/dashboard/calendar"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Calendar
                {!canUseCalendar && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 ml-auto">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/history"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <History className="w-5 h-5" />
                History
                {!canUseHistory && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 ml-auto">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/insights"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Lightbulb className="w-5 h-5" />
                Insights
                {!canUseHistory && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 ml-auto">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        {/* Gmail sync status - only show if not connected */}
        {!isGmailConnected && (
          <div className="p-4 border-t border-white/5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-medium text-white">Gmail Sync</span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                Connect Gmail to automatically detect bills from your inbox.
              </p>
              <Link
                href="/dashboard/settings"
                className="block w-full px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-center"
              >
                Connect Gmail
              </Link>
            </div>
          </div>
        )}

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
      <main className="lg:ml-64 h-screen overflow-y-auto overscroll-none pb-28 pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Mobile menu */}
            <Link
              href="/dashboard"
              className="lg:hidden flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>

            <h1 className="text-lg font-semibold text-white">Settings</h1>

            <div className="w-10 lg:hidden" />
          </div>
        </header>

        {/* Content */}
        <div className="p-6 max-w-2xl mx-auto space-y-10">
          {/* Gmail Connection */}
          <section>
            <SectionHeader
              icon={Mail}
              iconGradient="from-red-500/80 to-orange-500/80"
              title="Gmail Connection"
              description="Automatically detect bills from your inbox"
              index={0}
            />

            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
            >
              {/* Subtle background pattern */}
              <div className="absolute inset-0 bg-white/[0.01]" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAxKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

              <div className="relative p-6">
                {!isGmailConnected ? (
                  <>
                    {/* Not connected state */}
                    <div className="flex items-start gap-5 mb-6">
                      <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl" />
                        <div className="relative w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                          <GoogleIcon className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <div className="pt-1">
                        <h3 className="font-semibold text-white tracking-wide mb-1">
                          Connect your Google account
                        </h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                          We&apos;ll scan your inbox for bill-related emails and automatically
                          extract due dates, amounts, and payee information using AI.
                        </p>
                      </div>
                    </div>

                    {/* Privacy notice with decorative border */}
                    <div className="relative p-5 rounded-xl bg-orange-500/[0.03] border border-orange-500/10 mb-6">
                      {/* Corner accents */}
                      <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-orange-400/30 rounded-tl-sm" />
                      <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-orange-400/30 rounded-tr-sm" />
                      <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-orange-400/30 rounded-bl-sm" />
                      <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-orange-400/30 rounded-br-sm" />

                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <Shield className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-orange-300 mb-2 tracking-wide">
                            Your privacy is protected
                          </p>
                          <ul className="text-sm text-zinc-400 space-y-1.5">
                            <li className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-orange-400/60" />
                              Read-only access to emails
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-orange-400/60" />
                              Only bill-related emails are processed
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-orange-400/60" />
                              You can disconnect anytime
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Connect button */}
                    <button
                      onClick={handleConnectGmail}
                      className="group relative w-full flex items-center justify-center gap-3 px-5 py-3.5 overflow-hidden rounded-xl font-medium transition-all duration-300"
                    >
                      <div className="absolute inset-0 bg-white" />
                      <div className="absolute inset-0 bg-gradient-to-r from-zinc-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-black/5 to-transparent transition-transform duration-700" />
                      <GoogleIcon className="w-5 h-5 text-zinc-800 relative z-10" />
                      <span className="relative z-10 text-zinc-800 font-semibold tracking-wide">
                        Connect with Google
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* Connected state */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-emerald-400/30 rounded-2xl blur-xl" />
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Check className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white tracking-wide text-sm sm:text-base truncate">{user?.email}</p>
                          <p className="text-xs sm:text-sm text-zinc-500">Gmail connected and syncing</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="group relative flex-1 flex items-center justify-center gap-2 px-3 sm:px-5 py-3 sm:py-3.5 overflow-hidden rounded-xl font-medium transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                        <Sparkles className="w-4 h-4 text-white relative z-10 flex-shrink-0" />
                        <span className="relative z-10 text-white font-semibold text-sm sm:text-base whitespace-nowrap">
                          Import Bills
                        </span>
                      </button>
                      <button
                        onClick={handleDisconnectGmail}
                        className="px-3 sm:px-5 py-3 sm:py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-zinc-400 hover:text-white font-medium rounded-xl transition-all duration-300 text-sm sm:text-base"
                      >
                        Disconnect
                      </button>
                    </div>

                    {/* Force Rescan Section */}
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      {!showForceRescanConfirm ? (
                        <button
                          onClick={() => setShowForceRescanConfirm(true)}
                          disabled={isForceRescanning}
                          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <RefreshCw className={cn("w-4 h-4", isForceRescanning && "animate-spin")} />
                          <span>No bills found? Force rescan all emails</span>
                        </button>
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/20">
                          <div className="flex items-start gap-3 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-amber-200 font-medium">Force Rescan</p>
                              <p className="text-xs text-zinc-400 mt-1">
                                This will clear all previously processed emails (except accepted bills)
                                and rescan everything. Use this if bills aren&apos;t appearing after the normal scan.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleForceRescan}
                              disabled={isForceRescanning}
                              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-sm font-medium text-amber-200 transition-colors"
                            >
                              {isForceRescanning ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Rescanning...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  Rescan All
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setShowForceRescanConfirm(false)}
                              disabled={isForceRescanning}
                              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Notification Preferences */}
          <section>
            <NotificationSection />
          </section>

          {/* Customization Section */}
          <section>
            <CustomizationSection />
          </section>

          {/* Widget Section */}
          <section>
            <WidgetSection />
          </section>

          {/* Subscription */}
          <section>
            <SubscriptionSection />
          </section>

          {/* Account */}
          <section>
            <SectionHeader
              icon={User}
              iconGradient="from-orange-500/80 to-amber-500/80"
              title="Account"
              description="Manage your account settings"
              index={2}
            />

            <div
              className="relative overflow-hidden p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
            >
              {/* Subtle gradient accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/5 to-amber-500/5 rounded-full blur-2xl" />

              <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {/* Premium avatar with glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl blur-lg opacity-40" />
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                      {/* Shine effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 via-transparent to-black/10" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-white tracking-wide">
                      {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-sm text-zinc-500">{user?.email}</p>
                  </div>
                </div>

                {/* Account badge */}
                <div className={cn(
                  "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border",
                  isPro
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-white/[0.04] border-white/[0.08]"
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isPro ? "bg-amber-400" : "bg-orange-400"
                  )} />
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wider",
                    isPro ? "text-amber-400" : "text-zinc-400"
                  )}>
                    {isPro ? "Pro Plan" : "Free Plan"}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="group relative flex items-center justify-center gap-2.5 w-full px-5 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all duration-300"
              >
                <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                <span className="font-medium text-zinc-300 group-hover:text-white tracking-wide transition-colors">
                  Sign Out
                </span>
              </button>
            </div>
          </section>

          {/* Customer Support */}
          <section>
            <SectionHeader
              icon={Mail}
              iconGradient="from-orange-500/80 to-orange-500/80"
              title="Customer Support"
              description="Get help when you need it"
              index={3}
            />

            <div
              className="relative overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.02] to-orange-500/[0.01]" />
              <div className="absolute inset-0 border border-white/[0.06] rounded-2xl" />

              <div className="relative p-4 sm:p-6 space-y-4">
                {/* Email Support */}
                <a
                  href="mailto:support@duezo.app"
                  className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">Email Support</p>
                    <p className="text-sm text-zinc-500">support@duezo.app</p>
                  </div>
                </a>

                {/* Feature Request */}
                <a
                  href="mailto:feedback@duezo.app?subject=Feature Request"
                  className="flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">Request a Feature</p>
                    <p className="text-sm text-zinc-500">We'd love to hear your ideas</p>
                  </div>
                </a>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <SectionHeader
              icon={AlertTriangle}
              iconGradient="from-red-500/80 to-rose-500/80"
              title="Danger Zone"
              description="Irreversible account actions"
              index={4}
            />

            <div
              className="relative overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
            >
              {/* Dramatic red glow background */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-rose-500/[0.02]" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />

              {/* Hazard pattern border */}
              <div className="absolute inset-0 border border-red-500/10 rounded-2xl" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

              <div className="relative p-6">
                <div className="flex items-start gap-5 mb-5">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-red-500/20 rounded-xl blur-lg animate-pulse" />
                    <div className="relative p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <p className="font-semibold text-white tracking-wide mb-1">Delete Account</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Permanently delete your account and all associated data including bills,
                      payment history, and preferences. This action cannot be undone.
                    </p>
                  </div>
                </div>

                {/* Warning notice */}
                <div className="p-4 rounded-xl bg-red-500/[0.03] border border-red-500/10 mb-5">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300/80">
                      This will immediately remove all your data from our servers.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="group relative px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl transition-all duration-300"
                >
                  <span className="font-medium text-red-400 group-hover:text-red-300 tracking-wide transition-colors">
                    Delete Account
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-white/[0.04]">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-600">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium tracking-wide">Duezo v1.0.0</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href="/privacy"
                  className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  Privacy Policy
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <span className="text-zinc-700">•</span>
                <Link
                  href="/terms"
                  className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  Terms of Service
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bill Import Modal */}
      <BillImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportBills}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        userEmail={user?.email || ''}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
