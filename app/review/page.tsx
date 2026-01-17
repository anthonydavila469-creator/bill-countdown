'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReviewCard } from '@/components/review-card';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { BillCategory } from '@/types';
import { EvidenceSnippet } from '@/lib/bill-extraction/types';
import {
  Zap,
  LayoutGrid,
  Calendar,
  History,
  Lightbulb,
  Settings,
  LogOut,
  Mail,
  Loader2,
  Inbox,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewItem {
  id: string;
  extracted_name: string | null;
  extracted_amount: number | null;
  extracted_due_date: string | null;
  extracted_category: BillCategory | null;
  confidence_overall: number | null;
  confidence_amount: number | null;
  confidence_due_date: number | null;
  evidence_snippets: EvidenceSnippet[];
  is_duplicate: boolean;
  duplicate_reason: string | null;
  created_at: string;
  emails_raw?: {
    subject: string;
    from_address: string;
    date_received: string;
  } | null;
}

export default function ReviewQueuePage() {
  const router = useRouter();
  const supabase = createClient();
  const { showPaidToast } = useToast();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Review queue state
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Fetch review queue
  const fetchReviewQueue = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch('/api/extraction/review-queue');

      if (!response.ok) {
        throw new Error('Failed to fetch review queue');
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch review queue:', err);
      setError('Failed to load review queue');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchReviewQueue();
    }
  }, [user, fetchReviewQueue]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Confirm extraction
  const handleConfirm = async (
    id: string,
    corrections?: {
      name?: string;
      amount?: number;
      due_date?: string;
      category?: BillCategory;
    }
  ) => {
    setProcessingIds((prev) => new Set(prev).add(id));

    try {
      const response = await fetch('/api/extraction/review-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId: id,
          action: 'confirm',
          corrections,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm extraction');
      }

      const result = await response.json();

      if (result.success) {
        // Remove from list
        setItems((prev) => prev.filter((item) => item.id !== id));

        // Show success toast
        const item = items.find((i) => i.id === id);
        showPaidToast(
          corrections?.name || item?.extracted_name || 'Bill',
          corrections?.amount ?? item?.extracted_amount ?? null,
          () => {}
        );
      }
    } catch (err) {
      console.error('Failed to confirm:', err);
      setError('Failed to confirm extraction');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Reject extraction
  const handleReject = async (id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));

    try {
      const response = await fetch('/api/extraction/review-queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId: id,
          action: 'reject',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject extraction');
      }

      // Remove from list
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to reject:', err);
      setError('Failed to reject extraction');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
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
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                Suggestions
              </Link>
            </li>
            <li>
              <Link
                href="/review"
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <ClipboardCheck className="w-5 h-5" />
                Review Queue
                {items.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                    {items.length}
                  </span>
                )}
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
              <h1 className="text-xl font-bold text-white">Review Queue</h1>
              {items.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
                  {items.length} pending
                </span>
              )}
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchReviewQueue}
              disabled={isRefreshing}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all',
                'bg-white/10 hover:bg-white/15 text-white'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-400">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {isRefreshing && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-6 animate-pulse">
                <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Loading Review Queue
              </h2>
              <p className="text-zinc-400 text-center max-w-md">
                Fetching extractions that need your review...
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isRefreshing && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                All Caught Up!
              </h2>
              <p className="text-zinc-400 text-center max-w-md mb-6">
                No extractions need review. High-confidence bills are automatically
                added, and this queue shows items that need your verification.
              </p>
              <Link
                href="/dashboard/suggestions"
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-white/10 hover:bg-white/15 text-white transition-all"
              >
                <Mail className="w-4 h-4" />
                Scan for More Bills
              </Link>
            </div>
          )}

          {/* Review items */}
          {items.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400 mb-2">
                {items.length} extraction{items.length !== 1 ? 's' : ''} need{items.length === 1 ? 's' : ''} review
              </p>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <ReviewCard
                    key={item.id}
                    item={item}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    isLoading={processingIds.has(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
