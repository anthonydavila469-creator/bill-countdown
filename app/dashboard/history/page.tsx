'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bill } from '@/types';
import { cn, formatDate, formatCurrency, getDaysUntilDue } from '@/lib/utils';
import { getMissedBills } from '@/lib/risk-utils';
import { createClient } from '@/lib/supabase/client';
import { useBillsContext } from '@/contexts/bills-context';
import { iconMap, getIconFromName } from '@/lib/get-bill-icon';
import { useTheme } from '@/contexts/theme-context';
import {
  LayoutGrid,
  History,
  Settings,
  LogOut,
  Zap,
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
  FolderOpen,
} from 'lucide-react';

// Period filter options
type PeriodFilter = 'last30' | 'thisYear' | 'allTime';

const periodFilterLabels: Record<PeriodFilter, string> = {
  last30: 'Last 30 Days',
  thisYear: 'This Year',
  allTime: 'All Time',
};

function PaidBillCard({ bill, isRecent, isEven, showPaidDate = true }: { bill: Bill; isRecent?: boolean; isEven?: boolean; showPaidDate?: boolean }) {
  const { accentColor } = useTheme();
  const paidDate = bill.paid_at ? new Date(bill.paid_at) : new Date();
  const isAutoPay = bill.is_autopay || bill.paid_method === 'autopay';

  // Get icon - prefer icon_key, then auto-detect from name
  const explicitIcon = bill.icon_key ? iconMap[bill.icon_key] : null;
  const autoDetected = getIconFromName(bill.name);
  const IconComponent = explicitIcon || autoDetected.icon;
  const iconColorClass = explicitIcon ? 'text-emerald-400' : autoDetected.colorClass;

  // Get amount display - prefer last_paid_amount for history
  const displayAmount = bill.last_paid_amount ?? bill.amount;
  const isZeroAmount = !displayAmount || displayAmount === 0;

  return (
    <div className={cn(
      "group relative py-2 px-3 sm:py-2.5 sm:px-4 h-[52px] sm:h-[58px] rounded-xl transition-all duration-200",
      "border border-white/[0.04]",
      "hover:bg-white/[0.06] hover:border-white/10",
      isRecent && "ring-1 ring-emerald-500/15",
      isEven ? "bg-white/[0.015]" : "bg-white/[0.03]",
      isZeroAmount && "opacity-60"
    )}>
      <div className="flex items-center gap-2.5 sm:gap-3 h-full">
        {/* Icon tile with integrated paid check */}
        <div className="flex-shrink-0 relative">
          <div
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(to bottom right, color-mix(in srgb, ${accentColor} 12%, transparent), color-mix(in srgb, ${accentColor} 8%, transparent))`,
              border: `1px solid color-mix(in srgb, ${accentColor} 15%, transparent)`,
            }}
          >
            <IconComponent className={cn("w-4 h-4 sm:w-[18px] sm:h-[18px]", iconColorClass)} />
          </div>
          {/* Paid check — anchored to bottom-right of icon tile */}
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0F0A1E] flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Bill info — single line layout for density */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-white text-[13px] sm:text-sm truncate">{bill.name}</h3>
            <span className={cn(
              "flex-shrink-0 px-1.5 py-px rounded text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide",
              isAutoPay
                ? "bg-violet-500/15 text-violet-400/80"
                : "bg-white/[0.06] text-zinc-500"
            )}>
              {isAutoPay ? 'Auto' : 'Manual'}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
            Due {new Date(bill.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {showPaidDate && (
              <span className="text-zinc-600"> · Paid {paidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            )}
          </p>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isZeroAmount ? (
            <span className="text-xs sm:text-sm font-medium text-zinc-600 bg-white/[0.04] px-2 py-0.5 rounded-md">$0.00</span>
          ) : (
            <p className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums">
              ${displayAmount!.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}
          {bill.payment_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(bill.payment_url!, '_blank');
              }}
              className="text-zinc-600 hover:text-violet-400 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
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
  const { accentColor } = useTheme();
  // Check if bill was paid in last 7 days
  const isRecentPayment = (bill: Bill) => {
    if (!bill.paid_at) return false;
    const paidDate = new Date(bill.paid_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return paidDate >= sevenDaysAgo;
  };

  return (
    <div className="mb-5">
      {/* Month header — streamlined */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 mb-3 group sticky top-16 z-10 backdrop-blur-xl"
        style={{
          background: `linear-gradient(to right, color-mix(in srgb, ${accentColor} 6%, rgba(15,10,30,0.95)), rgba(15,10,30,0.9))`,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(to bottom right, color-mix(in srgb, ${accentColor} 20%, transparent), color-mix(in srgb, ${accentColor} 12%, transparent))`,
              border: `1px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
            }}
          >
            <Calendar className="w-5 h-5" style={{ color: accentColor }} />
          </div>
          <div className="text-left">
            <h2 className="text-base font-bold text-white">{label}</h2>
            <p className="text-xs text-zinc-500">
              {bills.length} bill{bills.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-lg font-bold tabular-nums" style={{ color: accentColor }}>
            ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <ChevronRight
            className={cn(
              "w-4 h-4 text-zinc-500 transition-transform duration-200",
              !isCollapsed && "rotate-90"
            )}
          />
        </div>
      </button>

      {/* Bills list grouped by paid date */}
      {!isCollapsed && (
        <div className="space-y-1 pl-1">
          {(() => {
            // Group bills by exact paid date
            const dateGroups: Record<string, Bill[]> = {};
            bills.forEach(bill => {
              const paidDate = bill.paid_at ? new Date(bill.paid_at) : new Date();
              const dateKey = paidDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
              dateGroups[dateKey].push(bill);
            });

            const dateEntries = Object.entries(dateGroups);
            let rowIndex = 0;

            return dateEntries.map(([dateLabel, dateBills]) => {
              // Always show date subheader to reduce per-row "Paid" repetition
              return (
                <div key={dateLabel}>
                  <div className="flex items-center gap-2 py-1 px-1 mt-1.5 first:mt-0">
                    <Clock className="w-3 h-3 text-emerald-500/40" />
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Paid {dateLabel}</span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                  {dateBills.map((bill) => {
                    const currentIndex = rowIndex++;
                    return (
                      <div
                        key={bill.id}
                        className="animate-in fade-in slide-in-from-bottom-1 mb-1"
                        style={{
                          animationDelay: `${currentIndex * 25}ms`,
                          animationFillMode: 'backwards',
                        }}
                      >
                        <PaidBillCard
                          bill={bill}
                          isRecent={isRecentPayment(bill)}
                          isEven={currentIndex % 2 === 0}
                          showPaidDate={false}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
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
      const dueDate = new Date(bill.due_date.includes('T') ? bill.due_date : bill.due_date + 'T00:00:00').toLocaleDateString();
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
          <div className="absolute left-0 bottom-full mb-2 w-44 rounded-xl bg-[#1a1a1e] border border-white/15 shadow-2xl z-50 overflow-hidden">
            <button
              onClick={exportToCSV}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors text-left"
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
  const { accentColor } = useTheme();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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
      <div className="min-h-screen bg-[#0F0A1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0A1E]">
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
              className="rounded-xl shadow-lg shadow-violet-500/20"
            />
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
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <History className="w-5 h-5" />
                History
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

        {/* Quick Add promo */}
        <div className="p-4 border-t border-white/5">
          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/10 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-medium text-white">Add a Bill</span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Use Quick Add or snap a photo — AI extracts the details instantly.
            </p>
            <Link
              href="/dashboard"
              className="block w-full px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-center"
            >
              Quick Add
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
      <main className="lg:ml-64 h-screen overflow-y-auto overscroll-none pb-28 pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0F0A1E]/80 backdrop-blur-xl border-b border-white/5">
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
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
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
        <div className="p-4 sm:p-6 pb-24 lg:pb-6">
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
                    ? "border"
                    : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                )}
                style={periodFilter === filter ? {
                  backgroundColor: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
                  borderColor: `color-mix(in srgb, ${accentColor} 40%, transparent)`,
                  color: accentColor,
                } : undefined}
              >
                {periodFilterLabels[filter]}
              </button>
            ))}
          </div>

          {/* Summary Row — This Period vs Last Period */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* This Period */}
            <div
              className="relative p-4 sm:p-5 rounded-2xl border overflow-hidden"
              style={{
                background: `linear-gradient(to bottom right, color-mix(in srgb, ${accentColor} 12%, transparent), color-mix(in srgb, ${accentColor} 6%, transparent))`,
                borderColor: `color-mix(in srgb, ${accentColor} 22%, transparent)`,
              }}
            >
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: accentColor }}>
                {periodFilter === 'last30' ? 'This Month' : periodFilter === 'thisYear' ? 'This Year' : 'All Time'}
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{filteredByPeriod.length} bill{filteredByPeriod.length !== 1 ? 's' : ''} paid</p>
            </div>

            {/* Last Period */}
            <div
              className="relative p-4 sm:p-5 rounded-2xl border overflow-hidden"
              style={{
                background: 'linear-gradient(to bottom right, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                {periodFilter === 'last30' ? 'Prev. 30 Days' : periodFilter === 'thisYear' ? 'Last Year' : '—'}
              </p>
              {periodFilter !== 'allTime' && previousPeriodStats > 0 ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-zinc-300 tabular-nums">
                    ${previousPeriodStats.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">previous period</p>
                </>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-zinc-600">—</p>
                  <p className="text-xs text-zinc-600 mt-1">{periodFilter === 'allTime' ? 'N/A' : 'No data yet'}</p>
                </>
              )}
            </div>
          </div>

          {/* Savings / Comparison Pill */}
          {comparisonDiff !== null && previousPeriodStats > 0 && comparisonDiff !== 0 && (
            <div className={cn(
              "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl mb-6 border",
              comparisonDiff < 0
                ? "bg-emerald-500/[0.12] border-emerald-500/25"
                : "bg-rose-500/[0.08] border-rose-500/20"
            )}>
              <TrendingUp className={cn(
                "w-4 h-4",
                comparisonDiff < 0 ? "rotate-180 text-emerald-400" : "text-rose-400"
              )} />
              <span className={cn(
                "text-sm font-bold tabular-nums",
                comparisonDiff < 0 ? "text-emerald-300" : "text-rose-400"
              )}>
                {comparisonDiff < 0 ? 'Saved' : 'Spent'} ${Math.abs(comparisonDiff).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-zinc-500 font-medium">
                vs {periodFilter === 'last30' ? 'prev. 30 days' : 'last year'}
              </span>
            </div>
          )}

          {/* Top Categories */}
          {topCategories.length > 0 && (
            <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
              {topCategories.map((cat) => (
                <div
                  key={cat.name}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{
                    background: `color-mix(in srgb, ${accentColor} 5%, transparent)`,
                    borderColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                  }}
                >
                  <span className="text-xs text-zinc-400 capitalize">{cat.name.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-bold text-white tabular-nums">
                    ${cat.total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Mobile Export Button */}
          <div className="sm:hidden mb-6">
            <ExportDropdown bills={filteredBills} periodFilter={periodFilter} />
          </div>

          {/* Missed Bills Section */}
          {missedBills.length > 0 && showMissedSection && (
            <div className="mb-8 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-violet-500/5 overflow-hidden">
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
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-violet-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
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
  );
}
