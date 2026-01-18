'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BillCard } from '@/components/bill-card';
import { AddBillModal } from '@/components/add-bill-modal';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { DeleteBillModal } from '@/components/delete-bill-modal';
import { BillDetailModal } from '@/components/bill-detail-modal';
import { PayNowModal } from '@/components/pay-now-modal';
import { BillListView } from '@/components/bill-list-view';
import { BatchActionBar, SnoozeOption } from '@/components/batch-action-bar';
import { SortFilterBar, SortOption, FilterOption } from '@/components/sort-filter-bar';
import { PaycheckSummaryCard } from '@/components/paycheck-summary-card';
import { Bill, DashboardView } from '@/types';
import { getDaysUntilDue } from '@/lib/utils';
import { getBillRiskType } from '@/lib/risk-utils';
import { RiskAlerts } from '@/components/risk-alerts';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/theme-context';
import { useBillMutations } from '@/hooks/use-bill-mutations';
import { Spinner } from '@/components/ui/animated-list';
import {
  Zap,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Settings,
  LogOut,
  Bell,
  Mail,
  Search,
  History,
  Loader2,
  X,
  Eye,
  EyeOff,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { dashboardLayout, paycheckSettings } = useTheme();

  // Use optimistic mutations hook
  const {
    bills,
    loading: billsLoading,
    markPaid,
    deleteBill,
    updateBill,
    snoozeBill,
    getMutationState,
    refetch,
  } = useBillMutations();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [view, setView] = useState<DashboardView>(dashboardLayout.defaultView);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaidBills, setShowPaidBills] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

  // List view state
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('due_date');
  const [quickFilter, setQuickFilter] = useState<FilterOption>('all');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Sync view with layout preference when it changes
  useEffect(() => {
    setView(dashboardLayout.defaultView);
  }, [dashboardLayout.defaultView]);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  // Check authentication and Gmail connection
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in, redirect to login
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
      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth, supabase]);

  // Check for onboarding when bills load
  useEffect(() => {
    if (!billsLoading && !hasCheckedOnboarding) {
      if (bills.length === 0) {
        setShowOnboarding(true);
      }
      setHasCheckedOnboarding(true);
    }
  }, [bills, billsLoading, hasCheckedOnboarding]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    // Refresh bills to show newly created ones
    await refetch();
  };

  // Handle "Add Manually" from onboarding
  const handleAddManuallyFromOnboarding = () => {
    setShowOnboarding(false);
    setEditingBill(null);
    setIsAddModalOpen(true);
  };

  // Filter and sort bills based on search, filters, and layout preferences
  const filteredBills = useMemo(() => {
    let filtered = bills.filter((bill) =>
      bill.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply quick filter (SortFilterBar)
    if (quickFilter !== 'all') {
      filtered = filtered.filter((bill) => {
        const daysLeft = getDaysUntilDue(bill.due_date);
        switch (quickFilter) {
          case 'due_soon':
            return daysLeft >= 0 && daysLeft <= 7 && !bill.is_paid;
          case 'overdue':
            return daysLeft < 0 && !bill.is_paid;
          case 'autopay':
            return bill.is_autopay && !bill.is_paid;
          case 'manual':
            return !bill.is_autopay && !bill.is_paid;
          case 'recurring':
            return bill.is_recurring && !bill.is_paid;
          default:
            return true;
        }
      });
    }

    // Sort - always keep overdue at top, then sort by selected criteria
    return filtered.sort((a, b) => {
      const aDaysLeft = getDaysUntilDue(a.due_date);
      const bDaysLeft = getDaysUntilDue(b.due_date);
      const aOverdue = aDaysLeft < 0 && !a.is_paid;
      const bOverdue = bDaysLeft < 0 && !b.is_paid;

      // Overdue bills always come first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then sort by selected criteria
      switch (sortBy) {
        case 'amount':
          return (b.amount || 0) - (a.amount || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'due_date':
        default:
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
    });
  }, [bills, searchQuery, sortBy, quickFilter]);

  // Calculate stats (only unpaid bills)
  const unpaidBills = bills.filter(b => !b.is_paid);
  const totalDue = unpaidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  // Use getDaysUntilDue for consistent calculation - includes bills due today (0 days)
  const billsDueSoon = unpaidBills.filter((bill) => {
    const daysUntil = getDaysUntilDue(bill.due_date);
    return daysUntil <= 7 && daysUntil >= 0;
  });
  const overdueBills = unpaidBills.filter((bill) => {
    const daysUntil = getDaysUntilDue(bill.due_date);
    return daysUntil < 0;
  });
  const notificationCount = billsDueSoon.length + overdueBills.length;

  // Handle adding/updating a bill
  const handleBillSuccess = async (bill: Bill) => {
    // Refresh bills from context
    await refetch();
    setEditingBill(null);
  };

  // Handle deleting a bill
  const handleDeleteConfirm = async () => {
    if (!deletingBill) return;
    await deleteBill(deletingBill.id);
    setDeletingBill(null);
  };

  // Handle bill card click - open detail modal
  const handleBillClick = (bill: Bill) => {
    setSelectedBill(bill);
  };

  // Handle editing a bill from detail modal
  const handleEditFromDetail = (bill: Bill) => {
    setSelectedBill(null);
    setEditingBill(bill);
    setIsAddModalOpen(true);
  };

  // Handle editing a bill from Risk Alerts (to add payment link)
  const handleEditFromRiskAlert = (bill: Bill) => {
    setEditingBill(bill);
    setIsAddModalOpen(true);
  };

  // Handle deleting a bill from detail modal
  const handleDeleteFromDetail = (bill: Bill) => {
    setSelectedBill(null);
    setDeletingBill(bill);
  };

  // Handle marking a bill as paid with undo support
  const handleMarkAsPaid = async (bill: Bill) => {
    await markPaid(bill);
    setSelectedBill(null);
  };

  // Handle marking a bill as paid from the card (without closing modal)
  const handleMarkAsPaidFromCard = async (bill: Bill) => {
    // For variable bills, show the pay modal to prompt for the actual amount
    if (bill.is_variable) {
      setPayingBill(bill);
      return;
    }
    await handleMarkAsPaid(bill);
  };

  // Handle Pay Now - opens payment link and shows confirmation modal
  const handlePayNow = (bill: Bill) => {
    // Open payment link in new tab
    if (bill.payment_url) {
      window.open(bill.payment_url, '_blank');
    }
    // Show confirmation modal
    setPayingBill(bill);
  };

  // Handle marking paid from Pay Now modal (with custom amount)
  const handleMarkPaidFromPayNow = async (bill: Bill, amount: number | null) => {
    await markPaid(bill, amount);
  };

  // Batch action: Mark all selected as paid
  const handleBatchMarkPaid = async () => {
    if (selectedBillIds.size === 0) return;

    setIsBatchProcessing(true);
    const selectedBills = bills.filter((b) => selectedBillIds.has(b.id) && !b.is_paid);

    // Process bills sequentially to avoid race conditions with recurring bills
    for (const bill of selectedBills) {
      await markPaid(bill);
    }

    // Clear selection after batch action
    setSelectedBillIds(new Set());
    setIsBatchProcessing(false);
  };

  // Batch action: Snooze selected bills
  const handleBatchSnooze = async (option: SnoozeOption) => {
    if (selectedBillIds.size === 0) return;

    setIsBatchProcessing(true);
    const daysToAdd = option === '1_day' ? 1 : option === '3_days' ? 3 : 7;

    const selectedBills = bills.filter((b) => selectedBillIds.has(b.id) && !b.is_paid);

    for (const bill of selectedBills) {
      await snoozeBill(bill.id, daysToAdd);
    }

    setSelectedBillIds(new Set());
    setIsBatchProcessing(false);
  };

  // Batch action: Delete selected bills
  const handleBatchDelete = async () => {
    if (selectedBillIds.size === 0) return;

    setIsBatchProcessing(true);
    const selectedBillsList = bills.filter((b) => selectedBillIds.has(b.id));

    for (const bill of selectedBillsList) {
      await deleteBill(bill.id);
    }

    setSelectedBillIds(new Set());
    setIsBatchProcessing(false);
  };

  // Clear batch selection
  const handleClearSelection = () => {
    setSelectedBillIds(new Set());
  };

  // Loading state
  if (isLoading || billsLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" variant="accent" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding for new users with no bills
  if (showOnboarding && hasCheckedOnboarding) {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        onAddManually={handleAddManuallyFromOnboarding}
      />
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
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
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

        {/* Gmail sync status - only show if not connected */}
        {!isGmailConnected && (
          <div className="p-4 border-t border-white/5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-blue-400" />
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
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md mx-4 lg:mx-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
                  )}
                </button>

                {/* Notifications Dropdown - Premium Glass Design */}
                {isNotificationsOpen && (
                  <div
                    className="absolute right-0 top-full mt-3 w-96 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    {/* Glow effect behind dropdown */}
                    <div className="absolute -inset-1 bg-gradient-to-b from-white/5 to-transparent rounded-2xl blur-xl" />

                    <div className="relative bg-[#0a0a0e]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
                      {/* Decorative top gradient line */}
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                      {/* Header */}
                      <div className="relative px-5 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center">
                                <Bell className="w-4 h-4 text-violet-400" />
                              </div>
                              {notificationCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-orange-500 to-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-orange-500/30">
                                  {notificationCount}
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm">Notifications</h3>
                              <p className="text-[11px] text-zinc-500">
                                {notificationCount === 0 ? 'All clear' : `${notificationCount} item${notificationCount === 1 ? '' : 's'} need attention`}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsNotificationsOpen(false)}
                            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="max-h-[400px] overflow-y-auto">
                        {notificationCount === 0 ? (
                          /* Premium Empty State */
                          <div className="px-5 py-10 text-center relative">
                            {/* Decorative background circles */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                              <div className="w-32 h-32 rounded-full border border-dashed border-zinc-700" />
                              <div className="absolute w-24 h-24 rounded-full border border-dashed border-zinc-700" />
                              <div className="absolute w-16 h-16 rounded-full border border-dashed border-zinc-700" />
                            </div>
                            <div className="relative">
                              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center border border-emerald-500/20">
                                <Bell className="w-6 h-6 text-emerald-400" />
                              </div>
                              <p className="text-sm font-medium text-white mb-1">You're all caught up!</p>
                              <p className="text-xs text-zinc-500 max-w-[200px] mx-auto">No bills need your attention right now. Enjoy your day!</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 space-y-3">
                            {/* Overdue Bills Section */}
                            {overdueBills.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 px-2 mb-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50 animate-pulse" />
                                  <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                                    Overdue
                                  </p>
                                  <span className="text-[10px] text-rose-400/60 font-medium">
                                    ({overdueBills.length})
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {overdueBills.slice(0, 3).map((bill) => {
                                    const daysOverdue = Math.abs(getDaysUntilDue(bill.due_date));
                                    return (
                                      <button
                                        key={bill.id}
                                        onClick={() => {
                                          setSelectedBill(bill);
                                          setIsNotificationsOpen(false);
                                        }}
                                        className="group w-full flex items-center gap-3 p-3 rounded-xl bg-rose-500/[0.05] hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 transition-all duration-200 text-left"
                                      >
                                        {/* Urgency indicator bar */}
                                        <div
                                          className="w-1 self-stretch rounded-full"
                                          style={{
                                            backgroundColor: 'var(--urgency-overdue)',
                                            boxShadow: '0 0 8px var(--urgency-overdue)'
                                          }}
                                        />
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-200">
                                          {bill.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-white truncate group-hover:text-rose-200 transition-colors">{bill.name}</p>
                                          <p className="text-xs text-rose-400/80 mt-0.5">
                                            {daysOverdue} day{daysOverdue === 1 ? '' : 's'} overdue
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-white">{bill.amount ? `$${bill.amount.toFixed(0)}` : ''}</p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Due Soon Section */}
                            {billsDueSoon.length > 0 && (
                              <div>
                                <div className="flex items-center gap-2 px-2 mb-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
                                  <p className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
                                    Due Soon
                                  </p>
                                  <span className="text-[10px] text-orange-400/60 font-medium">
                                    ({billsDueSoon.length})
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {billsDueSoon.slice(0, 3).map((bill) => {
                                    const daysUntil = getDaysUntilDue(bill.due_date);
                                    return (
                                      <button
                                        key={bill.id}
                                        onClick={() => {
                                          setSelectedBill(bill);
                                          setIsNotificationsOpen(false);
                                        }}
                                        className="group w-full flex items-center gap-3 p-3 rounded-xl bg-orange-500/[0.03] hover:bg-orange-500/[0.08] border border-orange-500/10 hover:border-orange-500/20 transition-all duration-200 text-left"
                                      >
                                        {/* Urgency indicator bar */}
                                        <div
                                          className="w-1 self-stretch rounded-full"
                                          style={{
                                            backgroundColor: daysUntil <= 3 ? 'var(--urgency-urgent)' : 'var(--urgency-soon)',
                                            boxShadow: `0 0 6px ${daysUntil <= 3 ? 'var(--urgency-urgent)' : 'var(--urgency-soon)'}`
                                          }}
                                        />
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-200">
                                          {bill.emoji}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-white truncate group-hover:text-orange-200 transition-colors">{bill.name}</p>
                                          <p className="text-xs text-orange-400/80 mt-0.5">
                                            {daysUntil === 0 ? 'Due today!' : daysUntil === 1 ? 'Due tomorrow' : `${daysUntil} days left`}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-white">{bill.amount ? `$${bill.amount.toFixed(0)}` : ''}</p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notificationCount > 0 && (
                        <div className="px-4 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                          <button
                            onClick={() => setIsNotificationsOpen(false)}
                            className="w-full py-2 text-center text-sm font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
                          >
                            View all bills →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setEditingBill(null);
                  setIsAddModalOpen(true);
                }}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Plus className="w-4 h-4" />
                Add Bill
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <div className="p-6">
          {/* Paycheck Summary Card - shown when paycheck mode is enabled */}
          {paycheckSettings?.enabled && (
            <div className="mb-6">
              <PaycheckSummaryCard bills={bills} settings={paycheckSettings} />
            </div>
          )}

          {/* Stats - conditionally rendered based on layout preferences, hidden when Paycheck Mode is active */}
          {dashboardLayout.showStatsBar && !paycheckSettings?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Total Due</p>
                <p className="text-3xl font-bold text-white">
                  ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Bills Due Soon</p>
                <p className="text-3xl font-bold text-orange-400">
                  {billsDueSoon.length}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Active Bills</p>
                <p className="text-3xl font-bold text-white">{unpaidBills.length}</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Payment Status</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400">
                    {unpaidBills.filter(b => b.is_autopay).length}
                  </span>
                  <span className="text-zinc-500">auto</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-2xl font-bold text-amber-400">
                    {unpaidBills.filter(b => !b.is_autopay).length}
                  </span>
                  <span className="text-zinc-500">manual</span>
                </div>
              </div>
            </div>
          )}

          {/* Risk Alerts Section */}
          <RiskAlerts
            bills={bills}
            onPayNow={handlePayNow}
            onMarkPaid={handleMarkAsPaidFromCard}
            onEditBill={handleEditFromRiskAlert}
            className="mb-6"
          />

          {/* Bills section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Your Bills</h2>
                <p className="text-sm text-zinc-400">
                  {filteredBills.filter(b => !b.is_paid).length} unpaid
                  {showPaidBills && ` • ${filteredBills.filter(b => b.is_paid).length} paid`}
                </p>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-3">
                {/* Show Paid Bills Toggle */}
                <button
                  onClick={() => setShowPaidBills(!showPaidBills)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200",
                    showPaidBills
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  {showPaidBills ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{showPaidBills ? 'Showing Paid' : 'Show Paid'}</span>
                </button>
                <div className="flex items-center bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setView('grid');
                      setSelectedBillIds(new Set()); // Clear selection when switching views
                    }}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      view === 'grid'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setView('list');
                      setSelectedBillIds(new Set()); // Clear selection when switching views
                    }}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      view === 'list'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sort & Filter Bar */}
            <SortFilterBar
              sortBy={sortBy}
              onSortChange={setSortBy}
              activeFilter={quickFilter}
              onFilterChange={setQuickFilter}
              className="mb-6"
            />

            {/* Empty state */}
            {filteredBills.filter(b => showPaidBills ? true : !b.is_paid).length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchQuery ? 'No bills found' : 'No bills yet'}
                </h3>
                <p className="text-zinc-400 mb-6">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Add your first bill to start tracking'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Bill
                  </button>
                )}
              </div>
            )}

            {/* Bills grid/list */}
            {filteredBills.filter(b => showPaidBills ? true : !b.is_paid).length > 0 && view === 'grid' && (
              <div
                className={cn(
                  'grid grid-cols-1 gap-4',
                  dashboardLayout.cardsPerRow === 2 && 'sm:grid-cols-2',
                  dashboardLayout.cardsPerRow === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                  dashboardLayout.cardsPerRow === 4 && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                )}
              >
                {/* Unpaid bills first */}
                {filteredBills.filter(b => !b.is_paid).map((bill, index) => (
                  <div
                    key={bill.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{
                      animationDelay: `${index * 75}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <BillCard
                      bill={bill}
                      onClick={() => handleBillClick(bill)}
                      onMarkPaid={handleMarkAsPaidFromCard}
                      onPayNow={handlePayNow}
                      variant={dashboardLayout.cardSize === 'compact' ? 'compact' : 'default'}
                      riskType={getBillRiskType(bill, bills)}
                    />
                  </div>
                ))}
                {/* Paid bills (when toggle is on) */}
                {showPaidBills && filteredBills.filter(b => b.is_paid).map((bill, index) => (
                  <div
                    key={bill.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{
                      animationDelay: `${(filteredBills.filter(b => !b.is_paid).length + index) * 75}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <BillCard
                      bill={bill}
                      onClick={() => handleBillClick(bill)}
                      variant={dashboardLayout.cardSize === 'compact' ? 'compact' : 'default'}
                      showMarkPaid={false}
                    />
                  </div>
                ))}
              </div>
            )}

            {filteredBills.filter(b => showPaidBills ? true : !b.is_paid).length > 0 && view === 'list' && (
              <BillListView
                bills={showPaidBills ? filteredBills : filteredBills.filter(b => !b.is_paid)}
                allBills={bills}
                selectedIds={selectedBillIds}
                onSelectionChange={setSelectedBillIds}
                onBillClick={handleBillClick}
                onMarkPaid={handleMarkAsPaidFromCard}
                onPayNow={handlePayNow}
              />
            )}
          </div>
        </div>
      </main>

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedCount={selectedBillIds.size}
        onMarkAllPaid={handleBatchMarkPaid}
        onSnooze={handleBatchSnooze}
        onDelete={handleBatchDelete}
        onClearSelection={handleClearSelection}
        isProcessing={isBatchProcessing}
      />

      {/* Mobile FAB */}
      <button
        onClick={() => {
          setEditingBill(null);
          setIsAddModalOpen(true);
        }}
        className={cn(
          "lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity",
          selectedBillIds.size > 0 && "bottom-24" // Move up when batch bar is visible
        )}
        style={{
          backgroundColor: 'var(--accent-primary)',
          boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--accent-primary) 25%, transparent)'
        }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Bill Modal */}
      <AddBillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBill(null);
        }}
        onSuccess={handleBillSuccess}
        editBill={editingBill}
      />

      {/* Delete Confirmation Modal */}
      <DeleteBillModal
        isOpen={!!deletingBill}
        bill={deletingBill}
        onClose={() => setDeletingBill(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Bill Detail Modal */}
      <BillDetailModal
        isOpen={!!selectedBill}
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        onMarkPaid={handleMarkAsPaid}
      />

      {/* Pay Now Modal */}
      {payingBill && (
        <PayNowModal
          bill={payingBill}
          isOpen={!!payingBill}
          onClose={() => setPayingBill(null)}
          onMarkPaid={handleMarkPaidFromPayNow}
        />
      )}
    </div>
  );
}
