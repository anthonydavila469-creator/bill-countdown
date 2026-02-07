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
import { SortFilterBar, SortOption, FilterOption } from '@/components/sort-filter-bar';
import { Bill, DashboardView } from '@/types';
import { getDaysUntilDue } from '@/lib/utils';
import { getBillRiskType } from '@/lib/risk-utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import { RiskAlerts } from '@/components/risk-alerts';
import { OnTimePayments } from '@/components/on-time-payments';
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
  Crown,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { dashboardLayout, updateDashboardLayout } = useTheme();
  const { canAddBill, showUpgradeModal, billsUsed, billLimit, isPro, canUsePaycheckMode, canUseCalendar, canUseHistory, refreshSubscription } = useSubscription();

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
  const [sortBy, setSortBy] = useState<SortOption>(dashboardLayout.sortBy || 'due_date');
  const [quickFilter, setQuickFilter] = useState<FilterOption>('all');

  // Layout settings popover state
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const layoutSettingsRef = useRef<HTMLDivElement>(null);

  // Sync view with layout preference when it changes
  useEffect(() => {
    setView(dashboardLayout.defaultView);
  }, [dashboardLayout.defaultView]);

  // Sync sortBy with layout preference when it changes
  useEffect(() => {
    if (dashboardLayout.sortBy) {
      setSortBy(dashboardLayout.sortBy);
    }
  }, [dashboardLayout.sortBy]);

  // Close layout settings popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (layoutSettingsRef.current && !layoutSettingsRef.current.contains(event.target as Node)) {
        setIsLayoutSettingsOpen(false);
      }
    };

    if (isLayoutSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLayoutSettingsOpen]);

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

  // Handle Add Bill button click - checks bill limit
  const handleAddBillClick = () => {
    if (canAddBill) {
      setEditingBill(null);
      setIsAddModalOpen(true);
    } else {
      showUpgradeModal('unlimited bills');
    }
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

  // Handle sort change - update local state and persist to layout settings
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    updateDashboardLayout({ sortBy: newSort });
  };

  // Handle adding/updating a bill
  const handleBillSuccess = async (bill: Bill) => {
    // Refresh bills from context and subscription state (for bill count)
    await refetch();
    await refreshSubscription();
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
        isGmailConnected={isGmailConnected}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-[#0c0c10] to-[#09090d] border-r border-white/[0.06] hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow duration-300">
              <Zap className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Due<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">zo</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4">
          {/* Section label */}
          <p className="px-3 mb-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Menu</p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/dashboard"
                className="group relative flex items-center gap-3 px-3 py-2.5 text-white rounded-xl bg-gradient-to-r from-white/[0.08] to-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200"
              >
                {/* Active indicator bar */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-blue-400 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/[0.08]">
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                </div>
                <span className="font-medium">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/calendar"
                className="group flex items-center gap-3 px-3 py-2.5 text-zinc-400 rounded-xl hover:bg-white/[0.04] hover:text-white transition-all duration-200"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06] border border-transparent group-hover:border-white/[0.06] transition-all duration-200">
                  <Calendar className="w-4 h-4 group-hover:text-cyan-400 transition-colors duration-200" />
                </div>
                <span className="font-medium">Calendar</span>
                {!canUseCalendar && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/history"
                className="group flex items-center gap-3 px-3 py-2.5 text-zinc-400 rounded-xl hover:bg-white/[0.04] hover:text-white transition-all duration-200"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06] border border-transparent group-hover:border-white/[0.06] transition-all duration-200">
                  <History className="w-4 h-4 group-hover:text-violet-400 transition-colors duration-200" />
                </div>
                <span className="font-medium">History</span>
                {!canUseHistory && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/insights"
                className="group flex items-center gap-3 px-3 py-2.5 text-zinc-400 rounded-xl hover:bg-white/[0.04] hover:text-white transition-all duration-200"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06] border border-transparent group-hover:border-white/[0.06] transition-all duration-200">
                  <Lightbulb className="w-4 h-4 group-hover:text-amber-400 transition-colors duration-200" />
                </div>
                <span className="font-medium">Insights</span>
                {!canUseHistory && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/settings"
                className="group flex items-center gap-3 px-3 py-2.5 text-zinc-400 rounded-xl hover:bg-white/[0.04] hover:text-white transition-all duration-200"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] group-hover:bg-white/[0.06] border border-transparent group-hover:border-white/[0.06] transition-all duration-200">
                  <Settings className="w-4 h-4 group-hover:text-zinc-300 transition-colors duration-200" />
                </div>
                <span className="font-medium">Settings</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Gmail sync status - only show if not connected */}
        {!isGmailConnected && (
          <div className="p-4 border-t border-white/[0.06]">
            <div className="relative p-4 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-blue-500/10 border border-blue-500/20">
              {/* Decorative glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <Mail className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Gmail Sync</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Connect Gmail to automatically detect bills from your inbox.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="block w-full px-3 py-2 text-sm font-semibold bg-gradient-to-r from-blue-500/20 to-violet-500/20 hover:from-blue-500/30 hover:to-violet-500/30 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 text-white text-center"
                >
                  Connect Gmail
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 p-2 -m-2 rounded-xl hover:bg-white/[0.03] transition-colors duration-200">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-orange-500/20">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all duration-200"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 h-16 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
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
                                    const { icon: BillIcon, colorClass } = getBillIcon(bill);
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
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                          <BillIcon className={cn("w-5 h-5", colorClass)} />
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
                                    const { icon: BillIcon, colorClass } = getBillIcon(bill);
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
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                          <BillIcon className={cn("w-5 h-5", colorClass)} />
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
                onClick={handleAddBillClick}
                className={cn(
                  "hidden sm:flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-opacity",
                  canAddBill
                    ? "text-white hover:opacity-90"
                    : "text-amber-200 border border-amber-500/30"
                )}
                style={canAddBill ? { backgroundColor: 'var(--accent-primary)' } : { backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
              >
                {canAddBill ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Crown className="w-4 h-4" />
                )}
                {canAddBill ? 'Add Bill' : `${billsUsed}/${billLimit} Bills`}
              </button>
            </div>
          </div>

        </header>

        {/* Dashboard content */}
        <div className="p-6">

          {/* On-Time Payments Counter - placed below Paycheck Mode widget */}
          <OnTimePayments bills={bills} className="mb-6" />

          {/* Stats - conditionally rendered based on layout preferences */}
          {dashboardLayout.showStatsBar && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] overflow-hidden group hover:border-white/[0.1] transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <p className="text-sm text-zinc-400 mb-1 font-medium">Total Due</p>
                <p className="text-3xl font-bold text-white">
                  ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-orange-500/[0.04] to-white/[0.01] border border-orange-500/10 overflow-hidden group hover:border-orange-500/20 transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
                <p className="text-sm text-zinc-400 mb-1 font-medium">Bills Due Soon</p>
                <p className="text-3xl font-bold text-orange-400">
                  {billsDueSoon.length}
                </p>
              </div>
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] overflow-hidden group hover:border-white/[0.1] transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <p className="text-sm text-zinc-400 mb-1 font-medium">Active Bills</p>
                <p className="text-3xl font-bold text-white">{unpaidBills.length}</p>
              </div>
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.06] overflow-hidden group hover:border-white/[0.1] transition-all duration-300">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <p className="text-sm text-zinc-400 mb-1 font-medium">Payment Status</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400">
                    {unpaidBills.filter(b => b.is_autopay).length}
                  </span>
                  <span className="text-zinc-500 text-sm">auto</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-2xl font-bold text-amber-400">
                    {unpaidBills.filter(b => !b.is_autopay).length}
                  </span>
                  <span className="text-zinc-500 text-sm">manual</span>
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
            className="mb-8"
          />

          {/* Bills section */}
          <div className="mb-6">
            {/* Section separator */}
            <div className="mb-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                  Your Bills
                </h2>

              {/* View controls */}
              <div className="flex items-center gap-2">
                {/* View toggle buttons */}
                <div className="flex items-center bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-xl p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <button
                    onClick={() => {
                      setView('grid');
                      setSelectedBillIds(new Set());
                    }}
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                      view === 'grid'
                        ? 'bg-gradient-to-b from-white/15 to-white/10 text-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]'
                        : 'text-zinc-500 hover:text-white hover:bg-white/[0.05]'
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setView('list');
                      setSelectedBillIds(new Set());
                    }}
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                      view === 'list'
                        ? 'bg-gradient-to-b from-white/15 to-white/10 text-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]'
                        : 'text-zinc-500 hover:text-white hover:bg-white/[0.05]'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Layout Settings Popover - moved here for better dropdown visibility */}
                <div className="relative" ref={layoutSettingsRef}>
                  <button
                    onClick={() => setIsLayoutSettingsOpen(!isLayoutSettingsOpen)}
                    className={cn(
                      'group flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200',
                      isLayoutSettingsOpen
                        ? 'bg-gradient-to-b from-white/[0.1] to-white/[0.05] border-white/[0.15] text-white'
                        : 'bg-gradient-to-b from-white/[0.05] to-white/[0.02] border-white/[0.08] text-zinc-400 hover:from-white/[0.08] hover:to-white/[0.04] hover:border-white/[0.12] hover:text-white'
                    )}
                    title="Layout settings"
                  >
                    <SlidersHorizontal className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      isLayoutSettingsOpen && 'rotate-180'
                    )} />
                  </button>

                  {isLayoutSettingsOpen && (
                    <div className="absolute top-full right-0 mt-2 z-50 w-56 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="absolute -inset-1 bg-gradient-to-b from-white/5 to-transparent rounded-2xl blur-xl" />
                      <div className="relative bg-[#0a0a0e]/98 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-white/[0.06]">
                          <p className="text-xs font-semibold text-white">Layout Settings</p>
                        </div>

                        <div className="p-2 space-y-1">
                          {/* Card Size */}
                          <div className="px-2 py-1.5">
                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Card Size</p>
                            <div className="flex gap-1">
                              {(['compact', 'default'] as const).map((size) => (
                                <button
                                  key={size}
                                  onClick={() => updateDashboardLayout({ cardSize: size })}
                                  className={cn(
                                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                                    dashboardLayout.cardSize === size
                                      ? 'bg-white/[0.1] text-white'
                                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                                  )}
                                >
                                  {size.charAt(0).toUpperCase() + size.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cards Per Row - hidden on mobile */}
                          <div className="hidden sm:block px-2 py-1.5">
                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Cards Per Row</p>
                            <div className="flex gap-1">
                              {[2, 3, 4].map((cols) => (
                                <button
                                  key={cols}
                                  onClick={() => updateDashboardLayout({ cardsPerRow: cols as 2 | 3 | 4 })}
                                  className={cn(
                                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                                    dashboardLayout.cardsPerRow === cols
                                      ? 'bg-white/[0.1] text-white'
                                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
                                  )}
                                >
                                  {cols}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Stats Bar Toggle */}
                          <button
                            onClick={() => updateDashboardLayout({ showStatsBar: !dashboardLayout.showStatsBar })}
                            className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-white/[0.05] transition-all duration-200"
                          >
                            <span className="text-xs font-medium text-zinc-300">Show Stats Bar</span>
                            <div
                              className={cn(
                                'relative w-9 h-5 rounded-full transition-all duration-200',
                                dashboardLayout.showStatsBar ? 'bg-cyan-500' : 'bg-white/10'
                              )}
                            >
                              <div
                                className={cn(
                                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                                  dashboardLayout.showStatsBar ? 'left-[18px]' : 'left-0.5'
                                )}
                              />
                            </div>
                          </button>

                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sort & Filter Controls */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <SortFilterBar
                sortBy={sortBy}
                onSortChange={handleSortChange}
                activeFilter={quickFilter}
                onFilterChange={setQuickFilter}
              />
            </div>

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
                    onClick={handleAddBillClick}
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 font-medium rounded-lg transition-opacity",
                      canAddBill
                        ? "text-white hover:opacity-90"
                        : "text-amber-200 border border-amber-500/30"
                    )}
                    style={canAddBill ? { backgroundColor: 'var(--accent-primary)' } : { backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                  >
                    {canAddBill ? (
                      <Plus className="w-5 h-5" />
                    ) : (
                      <Crown className="w-5 h-5" />
                    )}
                    {canAddBill ? 'Add Your First Bill' : 'Upgrade for More Bills'}
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

      {/* Mobile FAB */}
      <button
        onClick={handleAddBillClick}
        className={cn(
          "lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity",
          canAddBill ? "text-white" : "text-amber-200 border-2 border-amber-500/50"
        )}
        style={canAddBill ? {
          backgroundColor: 'var(--accent-primary)',
          boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--accent-primary) 25%, transparent)'
        } : {
          backgroundColor: 'rgba(245, 158, 11, 0.3)',
          boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.25)'
        }}
      >
        {canAddBill ? (
          <Plus className="w-6 h-6" />
        ) : (
          <Crown className="w-6 h-6" />
        )}
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
