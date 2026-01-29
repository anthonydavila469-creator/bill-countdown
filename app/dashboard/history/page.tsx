'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bill } from '@/types';
import { cn, formatDate, formatCurrency, getDaysUntilDue } from '@/lib/utils';
import { getMissedBills } from '@/lib/risk-utils';
import { createClient } from '@/lib/supabase/client';
import { useBillsContext } from '@/contexts/bills-context';
import { iconMap, getIconFromName, getCategoryColors } from '@/lib/get-bill-icon';
import {
  Zap,
  LayoutGrid,
  History,
  Settings,
  LogOut,
  Mail,
  Search,
  CheckCircle2,
  Calendar,
  DollarSign,
  ArrowLeft,
  Loader2,
  CreditCard,
  HandMetal,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  X,
  FileText,
  Download,
  ChevronDown,
  Receipt,
  Clock,
  Filter,
  ChevronRight,
  Crown,
  FolderOpen,
} from 'lucide-react';
import { ProFeatureGate } from '@/components/pro-feature-gate';
import { useSubscription } from '@/hooks/use-subscription';

// Period filter options
type PeriodFilter = 'last30' | 'thisYear' | 'allTime';

const periodFilterLabels: Record<PeriodFilter, string> = {
  last30: 'Last 30 Days',
  thisYear: 'This Year',
  allTime: 'All Time',
};

function PaidBillCard({ bill, isRecent, isEven }: { bill: Bill; isRecent?: boolean; isEven?: boolean }) {
  const paidDate = bill.paid_at ? new Date(bill.paid_at) : new Date();
  const isAutoPay = bill.is_autopay || bill.paid_method === 'autopay';
  const isRecurring = bill.is_recurring && bill.next_due_date;

  // Get icon - prefer icon_key, then auto-detect from name
  const explicitIcon = bill.icon_key ? iconMap[bill.icon_key] : null;
  const autoDetected = getIconFromName(bill.name);
  const IconComponent = explicitIcon || autoDetected.icon;
  const iconColorClass = explicitIcon ? 'text-emerald-400' : autoDetected.colorClass;

  // Get category colors
  const colors = getCategoryColors(bill.category);

  // Format next due date
  const nextDueFormatted = isRecurring
    ? new Date(bill.next_due_date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  // Get amount display - prefer last_paid_amount for history
  const displayAmount = bill.last_paid_amount ?? bill.amount;

  return (
    <div className={cn(
      "group relative p-4 rounded-2xl transition-all duration-300",
      "border border-white/5",
      "hover:bg-white/[0.06] hover:border-white/15 hover:shadow-lg hover:shadow-black/20",
      isRecent && "ring-1 ring-emerald-500/20",
      // Alternating backgrounds for visual separation
      isEven ? "bg-white/[0.02]" : "bg-white/[0.035]"
    )}>
      {/* Left accent bar - colored by category */}
      <div className={cn(
        "absolute left-0 top-3 bottom-3 w-1.5 rounded-full transition-all duration-300",
        colors.accent
      )} />

      <div className="flex items-center gap-4 pl-3">
        {/* Icon with paid status indicator */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            "w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-200",
            "group-hover:scale-105 group-hover:shadow-lg",
            `bg-gradient-to-br ${colors.bg}`,
            colors.border
          )}>
            <IconComponent className={cn("w-7 h-7", iconColorClass)} />
          </div>
          {/* Paid checkmark badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0c0c10] flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          {/* Recurring indicator */}
          {isRecurring && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-500/90 border border-[#0c0c10] flex items-center justify-center">
              <RefreshCw className="w-3 h-3 text-white animate-[spin_4s_linear_infinite]" />
            </div>
          )}
        </div>

        {/* Bill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h3 className="font-semibold text-white text-base truncate">{bill.name}</h3>
            {/* Auto/Manual badge */}
            {isAutoPay ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium">
                <CreditCard className="w-3.5 h-3.5" />
                Auto
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium">
                <HandMetal className="w-3.5 h-3.5" />
                Manual
              </span>
            )}
            {/* Recurring badge */}
            {bill.is_recurring && bill.recurrence_interval && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-medium capitalize">
                <RefreshCw className="w-3 h-3" />
                {bill.recurrence_interval}
              </span>
            )}
            {/* Variable badge */}
            {bill.is_variable && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium">
                <TrendingUp className="w-3 h-3" />
                Variable
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-zinc-500" />
              Due: {formatDate(bill.due_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500/70" />
              Paid {paidDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Amount and actions */}
        <div className="text-right space-y-2 flex-shrink-0">
          {displayAmount && (
            <p className="text-xl font-bold text-emerald-400">
              ${displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}
          {/* Show typical range for variable bills */}
          {bill.is_variable && bill.typical_min !== null && bill.typical_max !== null && (
            <p className="text-xs text-amber-400/70 flex items-center justify-end gap-1">
              <TrendingUp className="w-3 h-3" />
              Range: ${bill.typical_min.toFixed(0)} - ${bill.typical_max.toFixed(0)}
            </p>
          )}
          {/* Next due date indicator */}
          {isRecurring && nextDueFormatted && (
            <div className="flex items-center justify-end gap-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-500/15 to-cyan-500/10 border border-teal-500/25">
                <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-xs font-medium text-teal-400">
                  Next: {nextDueFormatted}
                </span>
              </div>
            </div>
          )}
          {/* View Payment Site link */}
          {bill.payment_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(bill.payment_url!, '_blank');
              }}
              className="flex items-center justify-end gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Payment Site</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Month section component with collapsible functionality
function MonthSection({
  monthKey,
  label,
  bills,
  totalAmount,
  isCollapsed,
  onToggle,
}: {
  monthKey: string;
  label: string;
  bills: Bill[];
  totalAmount: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  // Check if bill was paid in last 7 days
  const isRecentPayment = (bill: Bill) => {
    if (!bill.paid_at) return false;
    const paidDate = new Date(bill.paid_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return paidDate >= sevenDaysAgo;
  };

  return (
    <div className="mb-6">
      {/* Month header - more prominent styling */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-emerald-500/[0.08] via-white/[0.04] to-transparent border border-emerald-500/20 hover:border-emerald-500/30 hover:from-emerald-500/[0.12] transition-all duration-200 mb-4 group sticky top-16 z-10 backdrop-blur-xl shadow-lg shadow-black/10"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15 border border-emerald-500/30 flex items-center justify-center shadow-inner">
            <Calendar className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-white">{label}</h2>
            <p className="text-sm text-zinc-400">
              {bills.length} bill{bills.length !== 1 ? 's' : ''} paid
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-xl font-bold text-emerald-400">
              ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-zinc-500 font-medium">total paid</p>
          </div>
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
            "bg-white/5 group-hover:bg-white/10"
          )}>
            <ChevronRight
              className={cn(
                "w-5 h-5 text-zinc-400 transition-transform duration-200",
                !isCollapsed && "rotate-90"
              )}
            />
          </div>
        </div>
      </button>

      {/* Bills list with alternating backgrounds */}
      {!isCollapsed && (
        <div className="space-y-2 pl-2">
          {bills.map((bill, index) => (
            <div
              key={bill.id}
              className="animate-in fade-in slide-in-from-bottom-2"
              style={{
                animationDelay: `${index * 30}ms`,
                animationFillMode: 'backwards',
              }}
            >
              <PaidBillCard
                bill={bill}
                isRecent={isRecentPayment(bill)}
                isEven={index % 2 === 0}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export dropdown component
function ExportDropdown({ bills, periodFilter }: { bills: Bill[]; periodFilter: PeriodFilter }) {
  const [isOpen, setIsOpen] = useState(false);

  const exportToCSV = useCallback(() => {
    // Prepare CSV content
    const headers = ['Bill Name', 'Amount', 'Due Date', 'Paid Date', 'Payment Method', 'Category', 'Recurring'];
    const rows = bills.map(bill => {
      const paidDate = bill.paid_at ? new Date(bill.paid_at).toLocaleDateString() : '';
      const dueDate = new Date(bill.due_date).toLocaleDateString();
      const amount = bill.last_paid_amount ?? bill.amount ?? 0;
      const paymentMethod = bill.is_autopay || bill.paid_method === 'autopay' ? 'Auto-pay' : 'Manual';
      const category = bill.category || 'Other';
      const recurring = bill.is_recurring ? bill.recurrence_interval || 'Yes' : 'No';

      return [
        `"${bill.name.replace(/"/g, '""')}"`,
        amount.toFixed(2),
        dueDate,
        paidDate,
        paymentMethod,
        category,
        recurring,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-history-${periodFilterLabels[periodFilter].toLowerCase().replace(/\s+/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsOpen(false);
  }, [bills, periodFilter]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#16161a] border border-white/10 shadow-xl z-50 overflow-hidden">
            <button
              onClick={exportToCSV}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              Export as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const { canUseCalendar, canUseHistory } = useSubscription();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  // Use shared bills context
  const { bills: allBills, paidBills: contextPaidBills, loading: billsLoading } = useBillsContext();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [showMissedSection, setShowMissedSection] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(() => {
    // Restore last selection from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('historyPeriodFilter');
      if (saved && (saved === 'last30' || saved === 'thisYear' || saved === 'allTime')) {
        return saved as PeriodFilter;
      }
    }
    return 'thisYear';
  });
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

  // Save period filter to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('historyPeriodFilter', periodFilter);
    }
  }, [periodFilter]);

  // Toggle month collapse
  const toggleMonthCollapse = useCallback((monthKey: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  }, []);

  // Sort paid bills by paid date (most recent first)
  const paidBills = useMemo(() => {
    return [...contextPaidBills].sort((a, b) => {
      const dateA = a.paid_at ? new Date(a.paid_at).getTime() : 0;
      const dateB = b.paid_at ? new Date(b.paid_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [contextPaidBills]);

  // Filter bills by period
  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    return paidBills.filter(bill => {
      if (!bill.paid_at) return false;
      const paidDate = new Date(bill.paid_at);

      switch (periodFilter) {
        case 'last30': {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return paidDate >= thirtyDaysAgo;
        }
        case 'thisYear': {
          return paidDate.getFullYear() === now.getFullYear();
        }
        case 'allTime':
        default:
          return true;
      }
    });
  }, [paidBills, periodFilter]);

  // Calculate previous period stats for comparison
  const previousPeriodStats = useMemo(() => {
    const now = new Date();
    let previousTotal = 0;

    switch (periodFilter) {
      case 'last30': {
        // Compare to 30-60 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        paidBills.forEach(bill => {
          if (!bill.paid_at) return;
          const paidDate = new Date(bill.paid_at);
          if (paidDate >= sixtyDaysAgo && paidDate < thirtyDaysAgo) {
            previousTotal += bill.last_paid_amount ?? bill.amount ?? 0;
          }
        });
        break;
      }
      case 'thisYear': {
        // Compare to last year
        const lastYear = now.getFullYear() - 1;
        paidBills.forEach(bill => {
          if (!bill.paid_at) return;
          const paidDate = new Date(bill.paid_at);
          if (paidDate.getFullYear() === lastYear) {
            previousTotal += bill.last_paid_amount ?? bill.amount ?? 0;
          }
        });
        break;
      }
      default:
        break;
    }

    return previousTotal;
  }, [paidBills, periodFilter]);

  // Check authentication and Gmail connection
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
      setIsAuthLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth, supabase]);

  // Combined loading state
  const isLoading = isAuthLoading || billsLoading;

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Filter bills based on search (applied on top of period filter)
  const filteredBills = filteredByPeriod.filter((bill) =>
    bill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total paid for current period
  const totalPaid = filteredByPeriod.reduce((sum, bill) => sum + (bill.last_paid_amount ?? bill.amount ?? 0), 0);

  // Calculate comparison difference
  const comparisonDiff = periodFilter !== 'allTime' ? totalPaid - previousPeriodStats : null;

  // Group bills by month with totals
  const billsByMonth = useMemo(() => {
    const groups: Record<string, { label: string; bills: Bill[]; total: number }> = {};

    filteredBills.forEach(bill => {
      const paidDate = bill.paid_at ? new Date(bill.paid_at) : new Date();
      const monthKey = `${paidDate.getFullYear()}-${String(paidDate.getMonth()).padStart(2, '0')}`;
      const monthLabel = paidDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      if (!groups[monthKey]) {
        groups[monthKey] = { label: monthLabel, bills: [], total: 0 };
      }
      groups[monthKey].bills.push(bill);
      groups[monthKey].total += bill.last_paid_amount ?? bill.amount ?? 0;
    });

    return groups;
  }, [filteredBills]);

  // Calculate top categories by total spend
  const topCategories = useMemo(() => {
    const categoryStats: Record<string, { total: number; count: number }> = {};

    filteredByPeriod.forEach(bill => {
      const category = bill.category || 'Other';
      const amount = bill.last_paid_amount ?? bill.amount ?? 0;

      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, count: 0 };
      }
      categoryStats[category].total += amount;
      categoryStats[category].count += 1;
    });

    // Sort by total spend descending and take top 3
    return Object.entries(categoryStats)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        count: stats.count,
        average: stats.total / stats.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [filteredByPeriod]);

  // Get missed bills (bills that were due but never marked paid)
  const missedBills = getMissedBills(allBills);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ProFeatureGate
      feature="history"
      featureName="Payment History"
      featureDescription="Track all your past payments and see spending patterns over time."
      icon={History}
    >
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
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
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
            {/* Back button (mobile) */}
            <Link
              href="/dashboard"
              className="lg:hidden flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Title */}
            <h1 className="text-lg font-semibold text-white lg:block hidden">
              Payment History
            </h1>

            {/* Search */}
            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Export button */}
            <div className="hidden sm:block">
              <ExportDropdown bills={filteredBills} periodFilter={periodFilter} />
            </div>

            <div className="w-10 lg:hidden sm:hidden" /> {/* Spacer for mobile */}
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Period Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Filter className="w-4 h-4 text-zinc-500" />
            {(Object.keys(periodFilterLabels) as PeriodFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setPeriodFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  periodFilter === filter
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                    : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                )}
              >
                {periodFilterLabels[filter]}
              </button>
            ))}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Total Paid Card */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/10 to-teal-500/5 border border-emerald-500/25 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-sm text-emerald-400 font-medium">Total Paid</p>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                {comparisonDiff !== null && previousPeriodStats > 0 && comparisonDiff !== 0 && (
                  <p className={cn(
                    "text-sm font-medium flex items-center gap-1",
                    comparisonDiff > 0 ? "text-rose-400" : "text-emerald-400"
                  )}>
                    <TrendingUp className={cn("w-4 h-4", comparisonDiff < 0 && "rotate-180")} />
                    {comparisonDiff > 0 ? '+' : ''}${Math.abs(comparisonDiff).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} vs {periodFilter === 'last30' ? 'prev. 30d' : 'last year'}
                  </p>
                )}
                {periodFilter !== 'allTime' && previousPeriodStats === 0 && (
                  <p className="text-sm text-zinc-500 font-medium">
                    First tracked period
                  </p>
                )}
              </div>
            </div>

            {/* Bills Paid Card */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 via-violet-500/5 to-transparent border border-blue-500/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-sm text-blue-400 font-medium">Bills Paid</p>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{filteredByPeriod.length}</p>
                <p className="text-sm text-zinc-500">{periodFilterLabels[periodFilter].toLowerCase()}</p>
              </div>
            </div>

            {/* Top Categories Card */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 overflow-hidden sm:col-span-2 lg:col-span-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-violet-400" />
                  </div>
                  <p className="text-sm text-violet-400 font-medium">Top Categories</p>
                </div>
                {topCategories.length === 0 ? (
                  <p className="text-sm text-zinc-500">No category data</p>
                ) : (
                  <div className="space-y-2">
                    {topCategories.map((cat, index) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-600 text-xs font-mono">{index === 0 ? '├' : index === topCategories.length - 1 ? '└' : '├'}──</span>
                          <span className="text-sm text-zinc-300 truncate max-w-[120px]">{cat.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-white">
                          ${cat.count === 1
                            ? cat.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            : cat.average.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          <span className="text-xs text-zinc-500 font-normal ml-1">
                            {cat.count === 1 ? 'total' : '/avg'}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Export Button */}
          <div className="sm:hidden mb-6">
            <ExportDropdown bills={filteredBills} periodFilter={periodFilter} />
          </div>

          {/* Missed Bills Section */}
          {missedBills.length > 0 && showMissedSection && (
            <div className="mb-8 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-orange-500/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-rose-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">Bills You Missed Tracking</h3>
                    <p className="text-xs text-zinc-500">
                      {missedBills.length} bill{missedBills.length !== 1 ? 's' : ''} overdue by 30+ days and never marked paid
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMissedSection(false)}
                  className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                {missedBills.slice(0, 5).map((bill) => {
                  const daysOverdue = Math.abs(getDaysUntilDue(bill.due_date));
                  const { icon: IconComponent, colorClass } = getIconFromName(bill.name);
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10"
                    >
                      <div className="w-1 self-stretch rounded-full bg-rose-500/50" />
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <IconComponent className={cn("w-5 h-5", colorClass)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white text-sm truncate">{bill.name}</h4>
                        <p className="text-xs text-rose-400/80">
                          Was due {formatDate(bill.due_date)} • {daysOverdue} days overdue
                        </p>
                      </div>
                      {bill.amount && (
                        <span className="text-sm font-semibold text-zinc-400">
                          {formatCurrency(bill.amount)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {missedBills.length > 5 && (
                  <p className="text-xs text-zinc-500 text-center py-2">
                    +{missedBills.length - 5} more missed bills
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredBills.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchQuery ? 'No bills found' : 'No payment history yet'}
              </h3>
              <p className="text-zinc-400 mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : 'When you mark bills as paid, they will appear here.'}
              </p>
              {!searchQuery && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-violet-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          )}

          {/* Bills grouped by month */}
          {Object.entries(billsByMonth).length > 0 && (
            <div className="space-y-2">
              {Object.entries(billsByMonth)
                .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
                .map(([key, { label, bills, total }]) => (
                  <MonthSection
                    key={key}
                    monthKey={key}
                    label={label}
                    bills={bills}
                    totalAmount={total}
                    isCollapsed={collapsedMonths.has(key)}
                    onToggle={() => toggleMonthCollapse(key)}
                  />
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </ProFeatureGate>
  );
}
