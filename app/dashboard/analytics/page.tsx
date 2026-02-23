'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bill } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { SpendingChart } from '@/components/analytics/spending-chart';
import { CategoryPieChart } from '@/components/analytics/category-pie-chart';
import { CategoryBarChart } from '@/components/analytics/category-bar-chart';
import { CashFlowTimeline } from '@/components/analytics/cash-flow-timeline';
import {
  Zap,
  LayoutGrid,
  Settings,
  LogOut,
  Mail,
  History,
  Loader2,
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Lightbulb,
  Crown,
} from 'lucide-react';
import { ProFeatureGate } from '@/components/pro-feature-gate';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

type PeriodDays = 30 | 60 | 90;

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { canUseCalendar, canUseHistory } = useSubscription();

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [paidBills, setPaidBills] = useState<Bill[]>([]);
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Fetch all bills (unpaid)
      try {
        const response = await fetch('/api/bills');
        if (response.ok) {
          const data = await response.json();
          setBills(data);
        }
      } catch (error) {
        console.error('Failed to fetch bills:', error);
      }

      // Fetch paid bills for history
      try {
        const response = await fetch('/api/bills?showPaid=true');
        if (response.ok) {
          const data = await response.json();
          setPaidBills(data.filter((b: Bill) => b.is_paid));
        }
      } catch (error) {
        console.error('Failed to fetch paid bills:', error);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Calculate analytics
  const unpaidBills = bills.filter(b => !b.is_paid);
  const totalSpent = paidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const totalUpcoming = unpaidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const averageBill = paidBills.length > 0 ? totalSpent / paidBills.length : 0;

  // Get top category
  const categoryTotals = paidBills.reduce((acc, bill) => {
    const cat = bill.category || 'other';
    acc[cat] = (acc[cat] || 0) + (bill.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-zinc-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <ProFeatureGate
      feature="analytics"
      featureName="Analytics & Insights"
      featureDescription="Get detailed analytics and spending insights to understand your finances better."
      icon={BarChart3}
    >
    <div className="min-h-screen bg-[#08080c]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0c0c10] border-r border-white/5 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Due<span className="text-violet-400">zo</span>
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
                href="/dashboard/analytics"
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <BarChart3 className="w-5 h-5" />
                Analytics
                {!canUseHistory && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-400/20 border border-violet-400/30 ml-auto">
                    <Crown className="w-3 h-3 text-violet-300" />
                    <span className="text-[10px] font-semibold text-violet-200">Pro</span>
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
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-400/20 border border-violet-400/30 ml-auto">
                    <Crown className="w-3 h-3 text-violet-300" />
                    <span className="text-[10px] font-semibold text-violet-200">Pro</span>
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
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-400/20 border border-violet-400/30 ml-auto">
                    <Crown className="w-3 h-3 text-violet-300" />
                    <span className="text-[10px] font-semibold text-violet-200">Pro</span>
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

        {/* Gmail sync status */}
        <div className="p-4 border-t border-white/5">
          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-400/10 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="w-5 h-5 text-violet-400" />
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

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center text-white font-medium">
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
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-400 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-violet-400" />
              <h1 className="text-lg font-semibold text-white">Analytics</h1>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {([30, 60, 90] as PeriodDays[]).map((days) => (
                <button
                  key={days}
                  onClick={() => setPeriodDays(days)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    periodDays === days
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Analytics content */}
        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <p className="text-sm">Total Spent</p>
              </div>
              <p className="text-2xl font-bold text-white">
                ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-500 mt-1">From {paidBills.length} paid bills</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Calendar className="w-4 h-4" />
                <p className="text-sm">Upcoming</p>
              </div>
              <p className="text-2xl font-bold text-violet-400">
                ${totalUpcoming.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{unpaidBills.length} bills due</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <p className="text-sm">Average Bill</p>
              </div>
              <p className="text-2xl font-bold text-white">
                ${averageBill.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Per payment</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <PieChart className="w-4 h-4" />
                <p className="text-sm">Top Category</p>
              </div>
              <p className="text-2xl font-bold text-violet-300 capitalize">
                {topCategory.replace('_', ' ')}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Highest spending</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Spending Trends */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Spending Trends</h3>
              <SpendingChart bills={paidBills} periodDays={periodDays} />
            </div>

            {/* Category Breakdown */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
              <CategoryPieChart bills={paidBills} />
            </div>
          </div>

          {/* Category Comparison */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Category Comparison</h3>
            <CategoryBarChart bills={paidBills} />
          </div>

          {/* Cash Flow Forecast */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <h3 className="text-lg font-semibold text-white mb-4">Cash Flow Forecast</h3>
            <CashFlowTimeline bills={unpaidBills} periodDays={periodDays} />
          </div>
        </div>
      </main>
    </div>
    </ProFeatureGate>
  );
}
