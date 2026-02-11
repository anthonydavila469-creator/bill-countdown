'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bill } from '@/types';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  Zap,
  LayoutGrid,
  History,
  Settings,
  LogOut,
  Mail,
  Lightbulb,
  Calendar,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { Spinner } from '@/components/ui/animated-list';
import {
  getCurrentMonthKey,
  getPreviousMonthKey,
  getAvailableMonths,
  getPaidBillsForMonth,
  calculateMonthlyTotal,
  calculateCategoryBreakdown,
  compareCategorySpending,
  getNewBillsThisMonth,
  isFirstMonthTracked,
  getMonthLabel,
  getMonthlyTrends,
} from '@/lib/insights-utils';
import { MonthSelector } from '@/components/insights/month-selector';
import { SummaryCards } from '@/components/insights/summary-cards';
import { CategoryBreakdown } from '@/components/insights/category-breakdown';
import { CategoryChanges } from '@/components/insights/category-changes';
import { NewBillsList } from '@/components/insights/new-bills-list';
import { TrendChart } from '@/components/insights/trend-chart';
import { ProFeatureGate } from '@/components/pro-feature-gate';

export default function InsightsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { canUseCalendar, canUseHistory, isPro } = useSubscription();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  // Bills state
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());

  // Check authentication, Gmail connection, and fetch bills
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Check if Gmail is connected
      const { data: gmailToken } = await supabase
        .from('gmail_tokens')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setIsGmailConnected(!!gmailToken);

      // Fetch all bills including paid
      try {
        const response = await fetch('/api/bills?showPaid=true');
        if (response.ok) {
          const data = await response.json();
          setAllBills(data);
        }
      } catch (error) {
        console.error('Failed to fetch bills:', error);
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

  // Computed data based on selected month
  const availableMonths = useMemo(() => getAvailableMonths(allBills), [allBills]);

  const currentMonthBills = useMemo(
    () => getPaidBillsForMonth(allBills, selectedMonth),
    [allBills, selectedMonth]
  );

  const previousMonthKey = useMemo(() => getPreviousMonthKey(selectedMonth), [selectedMonth]);

  const previousMonthBills = useMemo(
    () => getPaidBillsForMonth(allBills, previousMonthKey),
    [allBills, previousMonthKey]
  );

  const currentTotal = useMemo(
    () => calculateMonthlyTotal(currentMonthBills),
    [currentMonthBills]
  );

  const previousTotal = useMemo(
    () => calculateMonthlyTotal(previousMonthBills),
    [previousMonthBills]
  );

  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(currentMonthBills),
    [currentMonthBills]
  );

  const categoryChanges = useMemo(
    () => compareCategorySpending(currentMonthBills, previousMonthBills),
    [currentMonthBills, previousMonthBills]
  );

  const newBills = useMemo(
    () => getNewBillsThisMonth(currentMonthBills, previousMonthBills),
    [currentMonthBills, previousMonthBills]
  );

  const isFirstMonth = useMemo(
    () => isFirstMonthTracked(allBills, selectedMonth),
    [allBills, selectedMonth]
  );

  const hasPaidBillsEver = useMemo(
    () => allBills.some((b) => b.is_paid),
    [allBills]
  );

  const trendData = useMemo(
    () => getMonthlyTrends(allBills, 6),
    [allBills]
  );

  const hasBillsInSelectedMonth = currentMonthBills.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl animate-pulse" />
            <Spinner size="lg" variant="accent" className="relative" />
          </div>
          <p className="text-zinc-400 font-medium">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <ProFeatureGate
      feature="analytics"
      featureName="Analytics & Insights"
      featureDescription="Get detailed analytics and spending insights to understand your finances better."
      icon={Lightbulb}
    >
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
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
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
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
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
        <header className="sticky top-0 z-40 bg-[#08080c]/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Back button (mobile) */}
            <Link
              href="/dashboard"
              className="lg:hidden flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Title */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/20 border border-amber-500/30">
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Monthly Insights</h1>
                <p className="text-xs text-zinc-500">Track your spending patterns</p>
              </div>
            </div>

            {/* Month selector */}
            <MonthSelector
              months={availableMonths}
              selectedMonth={selectedMonth}
              onChange={setSelectedMonth}
            />
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 pb-24 lg:pb-6 space-y-6">
          {/* Empty state: no paid bills ever */}
          {!hasPaidBillsEver && (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl" />
                <div className="relative p-6 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/20 border border-amber-500/30">
                  <BarChart3 className="w-12 h-12 text-amber-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                No payment history yet
              </h3>
              <p className="text-zinc-400 mb-8 max-w-md text-center">
                Start marking your bills as paid to unlock spending insights,
                category breakdowns, and month-over-month comparisons.
              </p>
              <Link
                href="/dashboard"
                className={cn(
                  'inline-flex items-center gap-2 px-6 py-3',
                  'bg-gradient-to-r from-amber-500 to-amber-500',
                  'text-white font-medium rounded-xl',
                  'hover:opacity-90 transition-opacity',
                  'shadow-lg shadow-amber-500/25'
                )}
              >
                <TrendingUp className="w-5 h-5" />
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Empty state: no bills in selected month */}
          {hasPaidBillsEver && !hasBillsInSelectedMonth && (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-zinc-500/10 rounded-full blur-2xl" />
                <div className="relative p-6 rounded-full bg-white/[0.02] border border-white/10">
                  <Calendar className="w-12 h-12 text-zinc-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                No bills paid in {getMonthLabel(selectedMonth)}
              </h3>
              <p className="text-zinc-400 mb-4 text-center">
                Select a different month to view insights.
              </p>
            </div>
          )}

          {/* Main content when we have bills */}
          {hasPaidBillsEver && hasBillsInSelectedMonth && (
            <>
              {/* Month in progress notice */}
              {selectedMonth === getCurrentMonthKey() && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Month in progress — data will update as you pay bills</span>
                </div>
              )}

              {/* Summary Cards */}
              <SummaryCards
                currentTotal={currentTotal}
                previousTotal={previousTotal}
                currentMonthLabel={getMonthLabel(selectedMonth)}
                previousMonthLabel={getMonthLabel(previousMonthKey)}
                isFirstMonth={isFirstMonth}
              />

              {/* Trend Chart */}
              <TrendChart trendData={trendData} />

              {/* Category Breakdown */}
              <CategoryBreakdown breakdown={categoryBreakdown} bills={currentMonthBills} />

              {/* Category Changes */}
              <CategoryChanges
                increases={categoryChanges.increases}
                decreases={categoryChanges.decreases}
                isFirstMonth={isFirstMonth}
              />

              {/* New Bills This Month */}
              <NewBillsList newBills={newBills} />
            </>
          )}
        </div>
      </main>
    </div>
    </ProFeatureGate>
  );
}
