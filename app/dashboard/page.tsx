'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { getDaysUntilDue, formatCurrency, getUrgency } from '@/lib/utils';
import { getBillRiskType } from '@/lib/risk-utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import { RiskAlerts } from '@/components/risk-alerts';
import { RecurringDetectionBanner } from '@/components/recurring-detection-banner';
import { NotificationBell } from '@/components/notification-bell';
import { OnTimePayments } from '@/components/on-time-payments';
import { CountdownDisplay } from '@/components/countdown-display';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/theme-context';
import { useBillMutations } from '@/hooks/use-bill-mutations';
import { useRecurringDetection } from '@/hooks/use-recurring-detection';
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
  SlidersHorizontal,
  AlertTriangle,
  Check,
  Trash2,
  DollarSign,
} from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

// Swipe-to-pay card wrapper
function SwipeBillCard({
  bill,
  onClick,
  onMarkPaid,
  children,
}: {
  bill: Bill;
  onClick: () => void;
  onMarkPaid: (bill: Bill) => void;
  children: React.ReactNode;
}) {
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [swiping, setSwiping] = useState(false);
  const [swipedPaid, setSwipedPaid] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff > 0 && cardRef.current) {
      cardRef.current.style.transform = `translateX(${Math.min(diff, 200)}px)`;
      cardRef.current.style.opacity = `${1 - Math.min(diff / 300, 0.5)}`;
      if (diff > 100) {
        cardRef.current.style.background = 'rgba(34, 197, 94, 0.2)';
      }
    }
  }, [swiping]);

  const handleTouchEnd = useCallback(() => {
    if (!swiping) return;
    setSwiping(false);
    const diff = touchCurrentX.current - touchStartX.current;
    if (diff > 100 && !bill.is_paid) {
      setSwipedPaid(true);
      hapticSuccess();
      setTimeout(() => onMarkPaid(bill), 300);
    } else if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '';
      cardRef.current.style.background = '';
    }
  }, [swiping, bill, onMarkPaid]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'transition-all duration-200',
        swipedPaid && 'animate-swipe-paid'
      )}
      style={{ willChange: 'transform' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Timeline bill row — icon left | name+amount center | countdown right
function TimelineBillRow({
  bill,
  onClick,
  onMarkPaid,
}: {
  bill: Bill;
  onClick: () => void;
  onMarkPaid: (bill: Bill) => void;
}) {
  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgency = getUrgency(daysLeft);
  const isOverdue = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 3;
  const { icon: IconComponent } = getBillIcon(bill);

  return (
    <SwipeBillCard bill={bill} onClick={onClick} onMarkPaid={onMarkPaid}>
      <div
        className={cn(
          'flex items-center gap-4 p-4 rounded-2xl backdrop-blur-xl cursor-pointer',
          'transition-all duration-300 hover:scale-[1.01]',
          isOverdue
            ? 'bg-[rgba(127,29,29,0.35)] border border-red-500/40'
            : isUrgent
              ? 'bg-[rgba(255,255,255,0.05)] animate-pulse-amber'
              : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(139,92,246,0.2)]'
        )}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-white/80" />
        </div>

        {/* Name + Amount */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{bill.name}</h4>
          <p className="text-sm text-zinc-400">
            {bill.amount ? formatCurrency(bill.amount) : 'No amount'}
          </p>
        </div>

        {/* Urgency countdown */}
        <div className="text-right flex-shrink-0">
          <span
            className={cn(
              'text-3xl font-extrabold tabular-nums',
              isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-white'
            )}
          >
            {Math.abs(daysLeft)}
          </span>
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider',
              isOverdue ? 'text-red-400' : 'text-zinc-500'
            )}
          >
            {isOverdue
              ? `${Math.abs(daysLeft) === 1 ? 'day' : 'days'} late`
              : daysLeft === 0
                ? 'today'
                : daysLeft === 1
                  ? 'day left'
                  : 'days left'}
          </p>
        </div>
      </div>
    </SwipeBillCard>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { dashboardLayout, updateDashboardLayout } = useTheme();
  const {
    canAddBill,
    refreshSubscription,
  } = useSubscription();

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

  // Recurring bill detection
  const {
    suggestions: recurringSuggestions,
    dismissSuggestion: dismissRecurringSuggestion,
    dismissAll: dismissAllRecurring,
    markAsRecurring,
    markAllAsRecurring,
  } = useRecurringDetection(bills);

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

  // Handle Add Bill button click
  const handleAddBillClick = () => {
    hapticLight();
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
      <div className="min-h-screen bg-[#0F0A1E]">
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
    <div className="min-h-screen bg-[#0F0A1E]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-[#130D24] to-[#0F0A1E] border-r border-white/[0.06] hidden lg:flex flex-col">
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
              Due<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-400">zo</span>
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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-violet-400 to-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/20 border border-white/[0.08]">
                  <LayoutGrid className="w-4 h-4 text-violet-400" />
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
                  <Calendar className="w-4 h-4 group-hover:text-violet-300 transition-colors duration-200" />
                </div>
                <span className="font-medium">Calendar</span>
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
            <div className="relative p-4 rounded-xl overflow-hidden bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-violet-500/10 border border-violet-500/20">
              {/* Decorative glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30">
                    <Mail className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Gmail Sync</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Connect Gmail to automatically detect bills from your inbox.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="block w-full px-3 py-2 text-sm font-semibold bg-gradient-to-r from-violet-500/20 to-violet-500/20 hover:from-violet-500/30 hover:to-violet-500/30 border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 text-white text-center"
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
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-violet-500/20">
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
        {/* Header - minimal: gear left, glowing + button right */}
        <header className="fixed top-0 left-0 right-0 z-50 lg:left-64 bg-[#0F0A1E]">
          {/* Safe area for notch */}
          <div className="h-[env(safe-area-inset-top)] bg-[#0F0A1E]" />
          <div className="flex items-center justify-between px-5 h-14 bg-[#0F0A1E]/95 backdrop-blur-md">
            {/* Left: Settings gear (mobile) / Search (desktop) */}
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/settings"
                className="lg:hidden p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                <Settings className="w-5 h-5" />
              </Link>
              {/* Desktop search */}
              <div className="hidden lg:block flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search bills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Right: Notification + Glowing Add button */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={handleAddBillClick}
                className="p-2.5 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 hover:text-white transition-all duration-200 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]"
                title="Add Bill"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <div className="px-5 py-4">

          {(() => {
            // Get hero bill (next upcoming unpaid bill)
            const heroBill = mounted ? unpaidBills
              .filter(b => getDaysUntilDue(b.due_date) >= 0)
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
              // Fall back to first overdue bill if no upcoming
              || unpaidBills.filter(b => getDaysUntilDue(b.due_date) < 0).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0]
              : null;

            // Remaining bills (exclude hero)
            const remainingBills = mounted ? unpaidBills
              .filter(b => b.id !== heroBill?.id)
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              : [];

            // Group remaining bills by timeline
            const now = new Date();
            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
            endOfWeek.setHours(23, 59, 59, 999);
            const endOfNextWeek = new Date(endOfWeek);
            endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

            const thisWeekBills = remainingBills.filter(b => {
              const d = new Date(b.due_date + 'T00:00:00');
              const days = getDaysUntilDue(b.due_date);
              return days < 0 || d <= endOfWeek;
            });
            const nextWeekBills = remainingBills.filter(b => {
              const d = new Date(b.due_date + 'T00:00:00');
              return d > endOfWeek && d <= endOfNextWeek;
            });
            const laterBills = remainingBills.filter(b => {
              const d = new Date(b.due_date + 'T00:00:00');
              return d > endOfNextWeek;
            });

            // Count bills due this month
            const thisMonth = now.getMonth();
            const thisYear = now.getFullYear();
            const billsThisMonth = unpaidBills.filter(b => {
              const d = new Date(b.due_date + 'T00:00:00');
              return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            });

            // Empty state
            if (unpaidBills.length === 0 && mounted) {
              return (
                <div className="relative py-8">
                  {/* Blurred placeholder bill cards in background */}
                  <div className="absolute inset-0 flex flex-col gap-3 blur-sm opacity-30 pointer-events-none pt-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] border border-[rgba(139,92,246,0.15)]">
                        <div className="w-11 h-11 rounded-xl bg-white/10" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-24 bg-white/10 rounded" />
                          <div className="h-3 w-16 bg-white/5 rounded" />
                        </div>
                        <div className="text-right">
                          <div className="h-8 w-10 bg-white/10 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Glowing CTA in foreground */}
                  <div className="relative z-10 flex flex-col items-center justify-center py-20">
                    <button
                      onClick={handleAddBillClick}
                      className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 transition-all duration-300 shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:shadow-[0_0_60px_rgba(139,92,246,0.7)] hover:scale-105"
                    >
                      <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                      Add your first bill
                    </button>
                    <p className="mt-4 text-zinc-500 text-sm">Start tracking your bills in seconds</p>
                  </div>
                </div>
              );
            }

            return (
              <>
                {/* Hero "Next Up" card */}
                {heroBill && (
                  <div className="relative mb-6">
                    {/* Ambient gradient orb behind hero */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-violet-500/20 blur-[100px] animate-ambient-pulse pointer-events-none" />

                    <div
                      onClick={() => handleBillClick(heroBill)}
                      className={cn(
                        'relative overflow-hidden rounded-3xl p-6 sm:p-8 cursor-pointer backdrop-blur-xl',
                        'transition-all duration-300 hover:scale-[1.01]',
                        getDaysUntilDue(heroBill.due_date) < 0
                          ? 'bg-[rgba(127,29,29,0.3)] border border-red-500/30'
                          : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(139,92,246,0.25)]'
                      )}
                      style={{
                        minHeight: '25vh',
                        boxShadow: getDaysUntilDue(heroBill.due_date) < 0
                          ? '0 8px 40px rgba(127,29,29,0.4)'
                          : '0 8px 40px rgba(139,92,246,0.15)',
                      }}
                    >
                      {/* Violet aura glow inside card */}
                      {getDaysUntilDue(heroBill.due_date) >= 0 && (
                        <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-violet-500/15 blur-[80px] pointer-events-none" />
                      )}

                      <div className="relative z-10 flex flex-col h-full justify-between">
                        {/* Top: label */}
                        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80 mb-2">
                          {getDaysUntilDue(heroBill.due_date) < 0 ? 'Overdue' : 'Next Up'}
                        </p>

                        {/* Center: countdown + name */}
                        <div className="flex-1 flex flex-col items-center justify-center py-4">
                          <CountdownDisplay
                            daysLeft={getDaysUntilDue(heroBill.due_date)}
                            urgency={getUrgency(getDaysUntilDue(heroBill.due_date))}
                            size="lg"
                            colorMode={getDaysUntilDue(heroBill.due_date) < 0 ? 'urgency' : 'gradient'}
                          />
                          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-3">
                            {heroBill.name}
                          </h2>
                          {heroBill.amount && (
                            <p className="text-3xl sm:text-4xl font-extrabold text-white/90 mt-1 tracking-tight">
                              {formatCurrency(heroBill.amount)}
                            </p>
                          )}
                        </div>

                        {/* Bottom: Mark as Paid button */}
                        {!heroBill.is_paid && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsPaidFromCard(heroBill);
                            }}
                            className="w-full py-3.5 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-violet-500/25"
                          >
                            <Check className="w-5 h-5 inline-block mr-2 -mt-0.5" />
                            Mark as Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick summary pill */}
                {mounted && (
                  <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm">
                      <span className="text-sm font-medium text-zinc-300">
                        {billsThisMonth.length} bill{billsThisMonth.length === 1 ? '' : 's'} left this month
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(totalDue)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Recurring Detection Banner */}
                {recurringSuggestions.length > 0 && (
                  <RecurringDetectionBanner
                    suggestions={recurringSuggestions}
                    onMarkRecurring={markAsRecurring}
                    onMarkAllRecurring={markAllAsRecurring}
                    onDismiss={dismissRecurringSuggestion}
                    onDismissAll={dismissAllRecurring}
                    className="mb-6"
                  />
                )}

                {/* Timeline sections */}
                <div className="space-y-6 pb-24">
                  {/* This Week */}
                  {thisWeekBills.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1">This Week</h3>
                      <div className="space-y-2">
                        {thisWeekBills.map((bill) => (
                          <TimelineBillRow
                            key={bill.id}
                            bill={bill}
                            onClick={() => handleBillClick(bill)}
                            onMarkPaid={handleMarkAsPaidFromCard}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Week */}
                  {nextWeekBills.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1">Next Week</h3>
                      <div className="space-y-2">
                        {nextWeekBills.map((bill) => (
                          <TimelineBillRow
                            key={bill.id}
                            bill={bill}
                            onClick={() => handleBillClick(bill)}
                            onMarkPaid={handleMarkAsPaidFromCard}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Later */}
                  {laterBills.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1">Later</h3>
                      <div className="space-y-2">
                        {laterBills.map((bill) => (
                          <TimelineBillRow
                            key={bill.id}
                            bill={bill}
                            onClick={() => handleBillClick(bill)}
                            onMarkPaid={handleMarkAsPaidFromCard}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

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
