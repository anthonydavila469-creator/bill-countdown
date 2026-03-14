'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AddBillModal } from '@/components/add-bill-modal';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { OnboardingModal, useOnboardingComplete } from '@/components/onboarding-modal';
import { DeleteBillModal } from '@/components/delete-bill-modal';
import { BillDetailModal } from '@/components/bill-detail-modal';
import { PayNowModal } from '@/components/pay-now-modal';
import { Bill } from '@/types';
import { getDaysUntilDue, formatCurrency, getUrgency, hexToRgba } from '@/lib/utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import { RecurringDetectionBanner } from '@/components/recurring-detection-banner';
import { NotificationBell } from '@/components/notification-bell';
import { CountdownDisplay } from '@/components/countdown-display';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/theme-context';
import { useBillMutations } from '@/hooks/use-bill-mutations';
import { useRecurringDetection } from '@/hooks/use-recurring-detection';
import { DashboardSkeleton } from '@/components/skeleton-loader';
import { hapticSuccess, hapticLight } from '@/lib/haptics';
import {
  Plus,
  LayoutGrid,
  Calendar,
  Settings,
  LogOut,
  Mail,
  Search,
  History,
  Check,
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
  accentColor,
}: {
  bill: Bill;
  onClick: () => void;
  onMarkPaid: (bill: Bill) => void;
  accentColor: string;
}) {
  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgency = getUrgency(daysLeft);
  const isOverdue = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 5;
  const isSoon = daysLeft > 5 && daysLeft <= 10;
  const { icon: IconComponent } = getBillIcon(bill);

  // Urgency-based colors
  const urgencyColor = isOverdue ? '#EF4444'
    : isUrgent ? '#F59E0B'
    : isSoon ? '#EAB308'
    : accentColor;

  // Gradient style for countdown numbers — uses CSS vars set by theme
  const urgencyGradientStyle: React.CSSProperties = isOverdue
    ? { backgroundImage: 'linear-gradient(160deg, var(--urgency-overdue-from), var(--urgency-overdue-to))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
    : isUrgent
    ? { backgroundImage: 'linear-gradient(160deg, var(--urgency-urgent-from), var(--urgency-urgent-to))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
    : isSoon
    ? { backgroundImage: 'linear-gradient(160deg, var(--urgency-soon-from), var(--urgency-soon-to))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
    : { backgroundImage: 'linear-gradient(160deg, var(--urgency-safe-from), var(--urgency-safe-to))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };

  return (
    <SwipeBillCard bill={bill} onClick={onClick} onMarkPaid={onMarkPaid}>
      <div
        className={cn(
          'relative flex items-center gap-4 p-4 rounded-2xl backdrop-blur-xl cursor-pointer',
          'transition-all duration-300 hover:scale-[1.01]',
          isOverdue
            ? 'bg-[rgba(127,29,29,0.25)]'
            : 'bg-white/[0.04]'
        )}
        style={{
          border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : hexToRgba(accentColor, 0.15)}`,
          boxShadow: `0 2px 16px ${isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.2)'}`,
        }}
      >
        {/* Colored left border accent */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{ backgroundColor: urgencyColor }}
        />

        {/* Icon with colored circular background */}
        <div
          className="flex-shrink-0 w-11 h-11 rounded-xl backdrop-blur-sm flex items-center justify-center ml-1"
          style={{
            backgroundColor: `${urgencyColor}18`,
            border: `1px solid ${urgencyColor}30`,
          }}
        >
          <IconComponent className="w-5 h-5" style={{ color: urgencyColor }} />
        </div>

        {/* Name + Amount */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{bill.name}</h4>
          <p className="text-sm text-zinc-400">
            {bill.amount ? formatCurrency(bill.amount) : 'No amount'}
          </p>
        </div>

        {/* Urgency countdown — BOLD and colored */}
        <div className="text-right flex-shrink-0">
          <span
            className="text-3xl font-black tabular-nums"
            style={urgencyGradientStyle}
          >
            {Math.abs(daysLeft)}
          </span>
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={urgencyGradientStyle}
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
  const { accentColor, cardGradient } = useTheme();
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
  const [searchQuery, setSearchQuery] = useState('');

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const onboardingComplete = useOnboardingComplete();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);


  // Mounted state for hydration-safe date calculations
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Calculate stats (only unpaid bills)
  const unpaidBills = bills.filter(b => !b.is_paid);
  const totalDue = unpaidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  // Use getDaysUntilDue for consistent calculation - includes bills due today (0 days)
  // Only calculate on client to avoid hydration mismatch

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
              Due<span style={{ color: '#A78BFA' }}>zo</span>
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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ background: accentColor, boxShadow: `0 0 8px ${hexToRgba(accentColor, 0.5)}` }} />
                <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.08]" style={{ background: hexToRgba(accentColor, 0.2) }}>
                  <LayoutGrid className="w-4 h-4" style={{ color: accentColor }} />
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
            <div className="relative p-4 rounded-xl overflow-hidden" style={{ background: `linear-gradient(to bottom right, ${hexToRgba(accentColor, 0.1)}, ${hexToRgba(accentColor, 0.05)}, ${hexToRgba(accentColor, 0.1)})`, border: `1px solid ${hexToRgba(accentColor, 0.2)}` }}>
              {/* Decorative glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl" style={{ backgroundColor: hexToRgba(accentColor, 0.2) }} />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: hexToRgba(accentColor, 0.2), border: `1px solid ${hexToRgba(accentColor, 0.3)}` }}>
                    <Mail className="w-4 h-4" style={{ color: accentColor }} />
                  </div>
                  <span className="text-sm font-semibold text-white">Gmail Sync</span>
                </div>
                <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                  Connect Gmail to automatically detect bills from your inbox.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="block w-full px-3 py-2 text-sm font-semibold border border-white/10 hover:border-white/20 rounded-lg transition-all duration-200 text-white text-center"
                  style={{ background: hexToRgba(accentColor, 0.2) }}
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
            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg" style={{ background: `linear-gradient(to bottom right, ${accentColor}, ${hexToRgba(accentColor, 0.7)})`, boxShadow: `0 10px 15px -3px ${hexToRgba(accentColor, 0.2)}` }}>
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
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  />
                </div>
              </div>
            </div>

            {/* Right: Notification + Glowing Add button */}
            <div className="flex items-center gap-2">
              <NotificationBell />
              <button
                onClick={handleAddBillClick}
                className="p-2.5 rounded-xl hover:text-white transition-all duration-200"
                style={{
                  backgroundColor: hexToRgba(accentColor, 0.2),
                  color: hexToRgba(accentColor, 0.8),
                  boxShadow: `0 0 20px ${hexToRgba(accentColor, 0.3)}`,
                }}
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
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05]" style={{ border: `1px solid ${hexToRgba(accentColor, 0.15)}` }}>
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
                      className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg text-white transition-all duration-300 hover:scale-105"
                      style={{
                        background: `linear-gradient(to right, ${accentColor}, ${hexToRgba(accentColor, 0.85)})`,
                        boxShadow: `0 0 40px ${hexToRgba(accentColor, 0.5)}`,
                      }}
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
                {heroBill && (() => {
                  const heroDays = getDaysUntilDue(heroBill.due_date);
                  const heroUrgency = getUrgency(heroDays);
                  const isHeroOverdue = heroDays < 0;
                  // Urgency-based countdown color
                                    return (
                  <div className="relative mb-6">
                    {/* Ambient gradient orb behind hero */}
                    <div
                      className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] animate-ambient-pulse pointer-events-none"
                      style={{ backgroundColor: isHeroOverdue ? 'rgba(239,68,68,0.25)' : hexToRgba(accentColor, 0.3) }}
                    />

                    <div
                      onClick={() => handleBillClick(heroBill)}
                      className={cn(
                        'relative overflow-hidden rounded-3xl p-6 sm:p-8 cursor-pointer backdrop-blur-xl',
                        'transition-all duration-300 hover:scale-[1.01]',
                      )}
                      style={{
                        minHeight: '25vh',
                        background: isHeroOverdue
                          ? 'linear-gradient(135deg, rgba(127,29,29,0.5) 0%, rgba(153,27,27,0.3) 50%, rgba(127,29,29,0.5) 100%)'
                          : cardGradient,
                        border: isHeroOverdue
                          ? '1px solid rgba(239,68,68,0.4)'
                          : `1px solid ${hexToRgba(accentColor, 0.35)}`,
                        boxShadow: isHeroOverdue
                          ? '0 8px 40px rgba(239,68,68,0.3), 0 0 80px rgba(239,68,68,0.1)'
                          : `0 8px 40px ${hexToRgba(accentColor, 0.35)}, 0 0 80px ${hexToRgba(accentColor, 0.15)}`,
                      }}
                    >
                      {/* Glossy highlight at top */}
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                      {/* Inner glow orbs */}
                      <div
                        className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none"
                        style={{ backgroundColor: isHeroOverdue ? 'rgba(239,68,68,0.15)' : hexToRgba(accentColor, 0.2) }}
                      />
                      <div
                        className="absolute -top-10 -left-10 w-40 h-40 rounded-full blur-[60px] pointer-events-none"
                        style={{ backgroundColor: isHeroOverdue ? 'rgba(239,68,68,0.1)' : hexToRgba(accentColor, 0.25) }}
                      />

                      <div className="relative z-10 flex flex-col h-full justify-between">
                        {/* Top: label */}
                        <p className={cn(
                          'text-xs font-semibold uppercase tracking-widest mb-2',
                          isHeroOverdue ? 'text-red-300' : 'text-white/70'
                        )}>
                          {isHeroOverdue ? 'Overdue' : 'Next Up'}
                        </p>

                        {/* Center: countdown + name */}
                        <div className="flex-1 flex flex-col items-center justify-center py-4">
                          <CountdownDisplay
                            daysLeft={heroDays}
                            urgency={heroUrgency}
                            size="lg"
                            colorMode="gradient"
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
                            className="w-full py-3.5 rounded-2xl font-bold text-base text-white transition-all duration-200 active:scale-[0.98] border border-white/30 bg-white/[0.08] hover:bg-white/[0.15] backdrop-blur-sm"
                          >
                            <Check className="w-5 h-5 inline-block mr-2 -mt-0.5" />
                            Mark as Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })()}

                {/* Summary Stats Bar */}
                {mounted && (() => {
                  const dueSoonCount = unpaidBills.filter(b => {
                    const d = getDaysUntilDue(b.due_date);
                    return d >= 0 && d <= 7;
                  }).length;
                  return (
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {/* DUE SOON */}
                    <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl bg-white/[0.04] border border-orange-500/40"
                      style={{ boxShadow: '0 4px 20px rgba(245,158,11,0.15)' }}>
                      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl bg-orange-500/15 pointer-events-none" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/80 mb-1">Due Soon</p>
                      <p className="text-2xl font-black text-orange-400 tabular-nums">{dueSoonCount}</p>
                    </div>
                    {/* ACTIVE */}
                    <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl bg-white/[0.04] border border-violet-500/20"
                      style={{ boxShadow: '0 4px 20px rgba(139,92,246,0.08)' }}>
                      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl bg-violet-500/15 pointer-events-none" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400/80 mb-1">Active</p>
                      <p className="text-2xl font-black text-violet-400 tabular-nums">{unpaidBills.length}</p>
                    </div>
                    {/* TOTAL DUE */}
                    <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl bg-white/[0.04] border border-teal-500/20"
                      style={{ boxShadow: '0 4px 20px rgba(20,184,166,0.08)' }}>
                      <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl bg-teal-500/15 pointer-events-none" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400/80 mb-1">Total</p>
                      <p className="text-2xl font-black text-teal-400 tabular-nums tracking-tight">{formatCurrency(totalDue)}</p>
                    </div>
                  </div>
                  );
                })()}

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
                      <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400/70 mb-3 px-1">This Week</h3>
                      <div className="space-y-2">
                        {thisWeekBills.map((bill) => (
                          <TimelineBillRow
                            key={bill.id}
                            bill={bill}
                            onClick={() => handleBillClick(bill)}
                            onMarkPaid={handleMarkAsPaidFromCard}
                            accentColor={accentColor}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Week */}
                  {nextWeekBills.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-violet-400/50 mb-3 px-1">Next Week</h3>
                      <div className="space-y-2">
                        {nextWeekBills.map((bill) => (
                          <TimelineBillRow
                            key={bill.id}
                            bill={bill}
                            onClick={() => handleBillClick(bill)}
                            onMarkPaid={handleMarkAsPaidFromCard}
                            accentColor={accentColor}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Later */}
                  {laterBills.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500/60 mb-3 px-1">Later</h3>
                      <div className="space-y-2">
                        {laterBills.map((bill) => (
                          <TimelineBillRow
                            key={bill.id}
                            bill={bill}
                            onClick={() => handleBillClick(bill)}
                            onMarkPaid={handleMarkAsPaidFromCard}
                            accentColor={accentColor}
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
