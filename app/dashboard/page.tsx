'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { BillCard } from '@/components/bill-card';
import { AddBillModal } from '@/components/add-bill-modal';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OnboardingModal, useOnboardingComplete } from '@/components/onboarding-modal';
import { DeleteBillModal } from '@/components/delete-bill-modal';
import { BillDetailModal } from '@/components/bill-detail-modal';
import { PayNowModal } from '@/components/pay-now-modal';
import { BillListView } from '@/components/bill-list-view';
import { SortFilterBar, SortOption, FilterOption } from '@/components/sort-filter-bar';
import { DashboardControls, CardSize } from '@/components/dashboard-controls';
import { Bill, DashboardView } from '@/types';
import { getDaysUntilDue } from '@/lib/utils';
import { getBillRiskType } from '@/lib/risk-utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import { RiskAlerts } from '@/components/risk-alerts';
import { DueSoonBanner } from '@/components/due-soon-banner';
import { NotificationBell } from '@/components/notification-bell';
import { OnTimePayments } from '@/components/on-time-payments';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/theme-context';
import { useBillMutations } from '@/hooks/use-bill-mutations';
import { Spinner } from '@/components/ui/animated-list';
import { DashboardSkeleton } from '@/components/skeleton-loader';
import { hapticSuccess, hapticLight } from '@/lib/haptics';
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
  AlertTriangle,
  Check,
  Trash2,
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
  const onboardingComplete = useOnboardingComplete();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // List view state
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>(dashboardLayout.sortBy || 'due_date');
  const [quickFilter, setQuickFilter] = useState<FilterOption>('all');

  // Layout settings popover state
  const [isLayoutSettingsOpen, setIsLayoutSettingsOpen] = useState(false);
  const layoutSettingsRef = useRef<HTMLDivElement>(null);

  // Mounted state for hydration-safe date calculations
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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
  // Notification dropdown moved to NotificationBell component

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
        if (!onboardingComplete) {
          setShowOnboardingModal(true);
        } else {
          setShowOnboarding(true);
        }
      }
      setHasCheckedOnboarding(true);
    }
  }, [bills, billsLoading, hasCheckedOnboarding, onboardingComplete]);

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
      hapticLight();
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
  // Only calculate on client to avoid hydration mismatch
  const billsDueSoon = mounted ? unpaidBills.filter((bill) => {
    const daysUntil = getDaysUntilDue(bill.due_date);
    return daysUntil <= 7 && daysUntil >= 0;
  }) : [];
  const overdueBills = mounted ? unpaidBills.filter((bill) => {
    const daysUntil = getDaysUntilDue(bill.due_date);
    return daysUntil < 0;
  }) : [];
  // notificationCount moved to NotificationBell component

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
    hapticSuccess();
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
      <div className="min-h-screen bg-[#08080c]">
        <DashboardSkeleton />
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
            <Image
              src="/logo-transparent-96.png"
              alt="Duezo"
              width={40}
              height={40}
              className="group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-lg font-bold text-white tracking-tight">
              Due<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">zo</span>
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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-orange-400 to-amber-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-white/[0.08]">
                  <LayoutGrid className="w-4 h-4 text-orange-400" />
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
                  <Calendar className="w-4 h-4 group-hover:text-orange-300 transition-colors duration-200" />
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
                  <History className="w-4 h-4 group-hover:text-orange-400 transition-colors duration-200" />
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
            <div className="relative p-4 rounded-xl overflow-hidden bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-orange-500/10 border border-orange-500/20">
              {/* Decorative glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30">
                    <Mail className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Gmail Sync</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Connect Gmail to automatically detect bills from your inbox.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="block w-full px-3 py-2 text-sm font-semibold bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 text-white text-center"
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
      <main className="lg:ml-64 pt-[calc(env(safe-area-inset-top)+4rem)] h-screen overflow-y-auto overscroll-none pb-28">
        {/* Header - fixed at top, content scrolls under */}
        <header className="fixed top-0 left-0 right-0 z-50 lg:left-64 bg-[#08080c]">
          {/* Safe area for notch */}
          <div className="h-[env(safe-area-inset-top)] bg-[#08080c]" />
          <div className="flex items-center justify-between px-6 h-16 bg-[#08080c] border-b border-white/5">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <Image
                src="/logo-transparent-96.png"
                alt="Duezo"
                width={40}
                height={40}
                className=""
              />
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
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Add Bill Button */}
              <button
                onClick={handleAddBillClick}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  canAddBill
                    ? "text-zinc-400 hover:text-white hover:bg-white/10"
                    : "text-amber-400 hover:bg-amber-500/10"
                )}
                title={canAddBill ? "Add Bill" : "Upgrade for more bills"}
              >
                {canAddBill ? (
                  <Plus className="w-5 h-5" />
                ) : (
                  <Crown className="w-5 h-5" />
                )}
              </button>

              {/* Notification Bell - In-app feed */}
              <NotificationBell />

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
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-orange-500/[0.08] to-white/[0.01] border border-orange-500/20 overflow-hidden group hover:border-orange-500/30 transition-all duration-300 flex flex-col items-center justify-center text-center">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
                <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wide">Due Soon</p>
                <p className="text-3xl sm:text-4xl font-black text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.3)]">
                  {billsDueSoon.length}
                </p>
              </div>
              <div className="relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.08] overflow-hidden group hover:border-white/[0.15] transition-all duration-300 flex flex-col items-center justify-center text-center">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wide">Active</p>
                <p className="text-3xl sm:text-4xl font-black text-white">{unpaidBills.length}</p>
              </div>
              <div className="relative p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-white/[0.01] border border-emerald-500/20 overflow-hidden group hover:border-emerald-500/30 transition-all duration-300 flex flex-col items-center justify-center text-center">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
                <p className="text-[10px] sm:text-xs text-zinc-400 mb-1 font-medium uppercase tracking-wide">Total</p>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                  ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                </p>
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

          {/* Due Soon Banner */}
          <DueSoonBanner bills={bills} className="mb-6" />

          {/* Bills section */}
          <div className="mb-6">
            {/* Section separator */}
            <div className="mb-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* Controls Row - Dropdown + Overdue button */}
            <div className="flex items-center gap-3 mb-4">
              {/* Combined Sort/View/CardSize dropdown */}
              <DashboardControls
                sortBy={sortBy}
                onSortChange={handleSortChange}
                view={view}
                onViewChange={(v) => {
                  setView(v);
                  setSelectedBillIds(new Set());
                }}
                cardSize={(dashboardLayout.cardSize || 'default') as CardSize}
                onCardSizeChange={(size) => updateDashboardLayout({ cardSize: size as 'compact' | 'default' })}
              />
              
              {/* Overdue quick filter */}
              <button
                onClick={() => setQuickFilter(quickFilter === 'overdue' ? 'all' : 'overdue')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  quickFilter === 'overdue'
                    ? 'bg-gradient-to-b from-rose-500/25 to-rose-600/15 border border-rose-400/50 text-rose-300 shadow-[0_0_20px_-4px_rgba(244,63,94,0.4)]'
                    : 'bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15]'
                )}
              >
                <AlertTriangle className={cn('w-4 h-4', quickFilter === 'overdue' ? 'text-rose-400' : 'text-zinc-500')} />
                Overdue
              </button>
            </div>

            {/* View controls - REMOVED, now in DashboardControls dropdown */}
            <div className="hidden">
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
                                dashboardLayout.showStatsBar ? 'bg-orange-500' : 'bg-white/10'
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

            {/* Bulk Action Bar - appears when items selected */}
            {selectedBillIds.size > 0 && (
              <div className="flex items-center justify-between gap-4 mb-4 p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 animate-in fade-in slide-in-from-top-2">
                <span className="text-sm font-medium text-white">
                  {selectedBillIds.size} bill{selectedBillIds.size === 1 ? '' : 's'} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const selectedBills = bills.filter(b => selectedBillIds.has(b.id) && !b.is_paid);
                      for (const bill of selectedBills) {
                        await markPaid(bill);
                      }
                      setSelectedBillIds(new Set());
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Paid
                  </button>
                  <button
                    onClick={() => {
                      const firstSelected = bills.find(b => selectedBillIds.has(b.id));
                      if (firstSelected) setDeletingBill(firstSelected);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedBillIds(new Set())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-zinc-300 border border-white/10 hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Bills grid/list */}
            {filteredBills.filter(b => showPaidBills ? true : !b.is_paid).length > 0 && view === 'grid' && (
              <div
                className={cn(
                  'grid grid-cols-1 gap-4 pb-24',
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
              <div className="pb-24">
              <BillListView
                bills={showPaidBills ? filteredBills : filteredBills.filter(b => !b.is_paid)}
                allBills={bills}
                selectedIds={selectedBillIds}
                onSelectionChange={setSelectedBillIds}
                onBillClick={handleBillClick}
                onMarkPaid={handleMarkAsPaidFromCard}
                onPayNow={handlePayNow}
              />
              </div>
            )}
          </div>
        </div>
      </main>

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

      {/* Onboarding Modal for first-time users */}
      {showOnboardingModal && (
        <OnboardingModal
          isGmailConnected={isGmailConnected}
          onComplete={() => {
            setShowOnboardingModal(false);
            setShowOnboarding(true);
          }}
          onConnectGmail={() => {
            window.location.href = '/api/gmail/connect';
          }}
          onSkip={() => {
            // Continue to next step in modal
          }}
        />
      )}
    </div>
  );
}
