'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bill, BillIconKey } from '@/types';
import { cn, formatDate, formatCurrency, getDaysUntilDue } from '@/lib/utils';
import { getMissedBills } from '@/lib/risk-utils';
import { createClient } from '@/lib/supabase/client';
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
  Home,
  Zap as Bolt,
  Wifi,
  Tv,
  Phone,
  Shield,
  Car,
  Heart,
  Dumbbell,
  Droplet,
  Flame,
  Trash2,
  Building,
  Music,
  Film,
  FileText,
  LucideIcon,
} from 'lucide-react';

// Icon mapping for bill categories
const iconMap: Record<BillIconKey, LucideIcon> = {
  home: Home,
  bolt: Bolt,
  wifi: Wifi,
  tv: Tv,
  phone: Phone,
  creditcard: CreditCard,
  shield: Shield,
  car: Car,
  heart: Heart,
  dumbbell: Dumbbell,
  water: Droplet,
  flame: Flame,
  trash: Trash2,
  building: Building,
  music: Music,
  film: Film,
  dollar: DollarSign,
  file: FileText,
};

function PaidBillCard({ bill }: { bill: Bill }) {
  const paidDate = bill.paid_at ? new Date(bill.paid_at) : new Date();
  const isAutoPay = bill.is_autopay || bill.paid_method === 'autopay';
  const isRecurring = bill.is_recurring && bill.next_due_date;
  const IconComponent = bill.icon_key ? iconMap[bill.icon_key] : null;

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
      "group relative p-4 bg-white/[0.02] border border-white/5 rounded-2xl transition-all duration-300",
      "hover:bg-white/[0.04] hover:border-emerald-500/20",
      isRecurring && "hover:border-teal-500/30"
    )}>
      {/* Left accent - gradient for recurring, solid for one-time */}
      <div className={cn(
        "absolute left-0 top-4 bottom-4 w-1 rounded-full transition-all duration-300",
        isRecurring
          ? "bg-gradient-to-b from-emerald-500/70 via-teal-500/50 to-cyan-500/30"
          : "bg-emerald-500/50"
      )} />

      <div className="flex items-center gap-4 pl-2">
        {/* Icon/Emoji with recurring indicator */}
        <div className="relative">
          <div className={cn(
            "w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-200",
            "group-hover:scale-105",
            isRecurring
              ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-teal-500/20"
              : "bg-emerald-500/10 border-emerald-500/20"
          )}>
            {IconComponent ? (
              <IconComponent className="w-6 h-6 text-emerald-400" />
            ) : (
              <span className="text-2xl">{bill.emoji}</span>
            )}
          </div>
          {/* Recurring orbit indicator */}
          {isRecurring && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0c0c10] border border-teal-500/30 flex items-center justify-center">
              <RefreshCw className="w-3 h-3 text-teal-400 animate-[spin_4s_linear_infinite]" />
            </div>
          )}
        </div>

        {/* Bill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-white truncate">{bill.name}</h3>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            {/* Auto/Manual badge */}
            {isAutoPay ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-medium">
                <CreditCard className="w-3 h-3" />
                Auto
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-medium">
                <HandMetal className="w-3 h-3" />
                Manual
              </span>
            )}
            {/* Recurring badge */}
            {bill.is_recurring && bill.recurrence_interval && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-400 text-[10px] font-medium capitalize">
                <RefreshCw className="w-3 h-3" />
                {bill.recurrence_interval}
              </span>
            )}
            {/* Variable badge */}
            {bill.is_variable && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-medium">
                <TrendingUp className="w-3 h-3" />
                Variable
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Due: {formatDate(bill.due_date)}
            </span>
          </div>
        </div>

        {/* Amount, paid date, and next due */}
        <div className="text-right space-y-1">
          {displayAmount && (
            <p className="text-lg font-bold text-emerald-400">
              ${displayAmount.toFixed(2)}
            </p>
          )}
          {/* Show typical range for variable bills */}
          {bill.is_variable && bill.typical_min !== null && bill.typical_max !== null && (
            <p className="text-[10px] text-amber-400/70 flex items-center justify-end gap-1">
              <TrendingUp className="w-2.5 h-2.5" />
              Range: ${bill.typical_min.toFixed(0)} - ${bill.typical_max.toFixed(0)}
            </p>
          )}
          <p className="text-xs text-zinc-500">
            Paid {paidDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          {/* Next due date indicator */}
          {isRecurring && nextDueFormatted && (
            <div className="flex items-center justify-end gap-1.5 mt-1.5">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20">
                <ArrowRight className="w-3 h-3 text-teal-400" />
                <span className="text-[11px] font-medium text-teal-400">
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
              className="flex items-center justify-end gap-1 mt-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              <span>View Payment Site</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bills state
  const [searchQuery, setSearchQuery] = useState('');
  const [paidBills, setPaidBills] = useState<Bill[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [showMissedSection, setShowMissedSection] = useState(true);

  // Check authentication and fetch paid bills
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Fetch all bills from API (including unpaid for missed detection)
      try {
        const response = await fetch('/api/bills?showPaid=true');
        if (response.ok) {
          const data = await response.json();
          setAllBills(data);
          // Filter for only paid bills and sort by paid date
          const paid = data
            .filter((b: Bill) => b.is_paid)
            .sort((a: Bill, b: Bill) => {
              const dateA = a.paid_at ? new Date(a.paid_at).getTime() : 0;
              const dateB = b.paid_at ? new Date(b.paid_at).getTime() : 0;
              return dateB - dateA; // Most recent first
            });
          setPaidBills(paid);
        }
      } catch (error) {
        console.error('Failed to fetch paid bills:', error);
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

  // Filter bills based on search
  const filteredBills = paidBills.filter((bill) =>
    bill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total paid
  const totalPaid = paidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);

  // Group bills by month
  const billsByMonth = filteredBills.reduce((groups, bill) => {
    const paidDate = bill.paid_at ? new Date(bill.paid_at) : new Date();
    const monthKey = `${paidDate.getFullYear()}-${paidDate.getMonth()}`;
    const monthLabel = paidDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    if (!groups[monthKey]) {
      groups[monthKey] = { label: monthLabel, bills: [] };
    }
    groups[monthKey].bills.push(bill);
    return groups;
  }, {} as Record<string, { label: string; bills: Bill[] }>);

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

        {/* Gmail sync status */}
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

            <div className="w-10 lg:hidden" /> {/* Spacer for mobile */}
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
              <p className="text-sm text-emerald-400 mb-1">Total Paid (30 days)</p>
              <p className="text-3xl font-bold text-white">
                ${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-sm text-zinc-400 mb-1">Bills Paid</p>
              <p className="text-3xl font-bold text-white">{paidBills.length}</p>
            </div>
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
                  const IconComponent = bill.icon_key ? iconMap[bill.icon_key] : null;
                  return (
                    <div
                      key={bill.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10"
                    >
                      <div className="w-1 self-stretch rounded-full bg-rose-500/50" />
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        {IconComponent ? (
                          <IconComponent className="w-5 h-5 text-zinc-400" />
                        ) : (
                          <span className="text-xl">{bill.emoji}</span>
                        )}
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
            <div className="space-y-8">
              {Object.entries(billsByMonth).map(([key, { label, bills }]) => (
                <div key={key}>
                  <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
                    {label}
                  </h2>
                  <div className="space-y-3">
                    {bills.map((bill, index) => (
                      <div
                        key={bill.id}
                        className="animate-in fade-in slide-in-from-bottom-2"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animationFillMode: 'backwards',
                        }}
                      >
                        <PaidBillCard bill={bill} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
