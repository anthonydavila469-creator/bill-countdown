'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Bill } from '@/types';
import { cn, getDaysUntilDue, formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useBillsContext } from '@/contexts/bills-context';
import { useTheme } from '@/contexts/theme-context';
import {
  usePaycheckSettings,
  getNextPaydays,
  PaycheckFrequency,
  PaycheckSettings,
} from '@/hooks/use-paycheck-settings';
import { iconMap, getIconFromName, getCategoryColors } from '@/lib/get-bill-icon';
import {
  Wallet,
  LayoutGrid,
  Calendar,
  History,
  Settings,
  LogOut,
  Mail,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  CalendarDays,
  PartyPopper,
  Sparkles,
  Clock,
  AlertCircle,
} from 'lucide-react';

// Frequency options
const FREQUENCY_OPTIONS: { value: PaycheckFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semimonthly', label: 'Semi-monthly (1st & 15th)' },
  { value: 'monthly', label: 'Monthly' },
];

// Format date for display
function formatPaycheckDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Get urgency color based on days until due
function getUrgencyColor(daysLeft: number): string {
  if (daysLeft < 0) return 'text-red-400';
  if (daysLeft <= 3) return 'text-orange-400';
  if (daysLeft <= 7) return 'text-yellow-400';
  return 'text-emerald-400';
}

// Bill row component for paycheck groups
function PaycheckBillRow({ bill }: { bill: Bill }) {
  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgencyColor = getUrgencyColor(daysLeft);

  // Get icon
  const explicitIcon = bill.icon_key ? iconMap[bill.icon_key] : null;
  const autoDetected = getIconFromName(bill.name);
  const IconComponent = explicitIcon || autoDetected.icon;
  const iconColorClass = explicitIcon ? 'text-violet-400' : autoDetected.colorClass;
  const colors = getCategoryColors(bill.category);

  const dueDate = new Date(bill.due_date + 'T12:00:00');
  const dueDateDisplay = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors">
      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0",
        `bg-gradient-to-br ${colors.bg}`,
        colors.border
      )}>
        <IconComponent className={cn("w-5 h-5", iconColorClass)} />
      </div>

      {/* Bill info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{bill.name}</p>
        <p className="text-xs text-zinc-500">Due {dueDateDisplay}</p>
      </div>

      {/* Days countdown */}
      <div className="text-right flex-shrink-0">
        <p className={cn("text-xs font-medium", urgencyColor)}>
          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d`}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0 min-w-[70px]">
        {bill.amount !== null ? (
          <p className="text-sm font-semibold text-white">{formatCurrency(bill.amount)}</p>
        ) : (
          <p className="text-sm text-zinc-500">-</p>
        )}
      </div>
    </div>
  );
}

// Paycheck period card
function PaycheckPeriodCard({
  paydayDate,
  nextPaydayDate,
  bills,
  estimatedAmount,
  isFirst,
}: {
  paydayDate: Date;
  nextPaydayDate: Date | null;
  bills: Bill[];
  estimatedAmount: number | null;
  isFirst: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isFirst);

  // Calculate totals
  const totalBillsAmount = bills.reduce((sum, bill) => sum + (bill.amount ?? 0), 0);
  const balanceAfter = estimatedAmount !== null ? estimatedAmount - totalBillsAmount : null;

  // Balance color
  const getBalanceColor = () => {
    if (balanceAfter === null) return 'text-zinc-400';
    if (balanceAfter < 0) return 'text-red-400';
    if (balanceAfter < 200) return 'text-orange-400';
    return 'text-emerald-400';
  };

  const paydayLabel = formatPaycheckDate(paydayDate);

  return (
    <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-300">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-white">{paydayLabel}</p>
            <p className="text-xs text-zinc-500">
              {bills.length} bill{bills.length !== 1 ? 's' : ''} due
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Totals */}
          <div className="text-right">
            <p className="text-sm font-semibold text-white">
              {formatCurrency(totalBillsAmount)}
            </p>
            {balanceAfter !== null && (
              <p className={cn("text-xs font-medium", getBalanceColor())}>
                {balanceAfter >= 0 ? '+' : ''}{formatCurrency(balanceAfter)} left
              </p>
            )}
          </div>

          {/* Expand toggle */}
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {bills.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <PartyPopper className="w-5 h-5 text-emerald-400" />
              <p className="text-sm text-emerald-400 font-medium">
                You&apos;re clear this paycheck!
              </p>
            </div>
          ) : (
            bills.map((bill) => <PaycheckBillRow key={bill.id} bill={bill} />)
          )}

          {/* Summary bar */}
          {bills.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
              <span className="text-sm text-zinc-400">Total this period</span>
              <span className="text-sm font-semibold text-white">{formatCurrency(totalBillsAmount)}</span>
            </div>
          )}

          {balanceAfter !== null && bills.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Balance after bills</span>
              <span className={cn("text-sm font-semibold", getBalanceColor())}>
                {formatCurrency(balanceAfter)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Settings form component
function PaycheckSettingsForm({
  initialSettings,
  onSave,
  onCancel,
}: {
  initialSettings: PaycheckSettings | null;
  onSave: (settings: PaycheckSettings) => void;
  onCancel?: () => void;
}) {
  const [frequency, setFrequency] = useState<PaycheckFrequency>(
    initialSettings?.frequency ?? 'biweekly'
  );
  const [lastPayday, setLastPayday] = useState(initialSettings?.lastPayday ?? '');
  const [estimatedAmount, setEstimatedAmount] = useState<string>(
    initialSettings?.estimatedAmount?.toString() ?? ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastPayday) return;

    onSave({
      frequency,
      lastPayday,
      estimatedAmount: estimatedAmount ? parseFloat(estimatedAmount) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          How often do you get paid?
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as PaycheckFrequency)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent appearance-none cursor-pointer"
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Last Payday */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          When was your last payday?
        </label>
        <input
          type="date"
          value={lastPayday}
          onChange={(e) => setLastPayday(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent [color-scheme:dark]"
        />
      </div>

      {/* Estimated Amount */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Estimated paycheck amount <span className="text-zinc-500">(optional)</span>
        </label>
        <div className="relative">
          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="number"
            step="0.01"
            min="0"
            value={estimatedAmount}
            onChange={(e) => setEstimatedAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          We&apos;ll show your remaining balance after bills
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 font-medium hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!lastPayday}
          className="flex-1 px-4 py-3 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Settings
        </button>
      </div>
    </form>
  );
}

export default function PaycheckPage() {
  const router = useRouter();
  const supabase = createClient();
  const { accentColor } = useTheme();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  // Bills from context
  const { unpaidBills, loading: billsLoading } = useBillsContext();

  // Paycheck settings
  const { settings, isLoaded, hasSettings, saveSettings } = usePaycheckSettings();

  // UI state
  const [showSettings, setShowSettings] = useState(false);

  // Check authentication
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

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Calculate next paydays and group bills
  const paycheckGroups = useMemo(() => {
    if (!settings || !settings.lastPayday) return [];

    const paydays = getNextPaydays(settings, 4);
    const groups: {
      paydayDate: Date;
      nextPaydayDate: Date | null;
      bills: Bill[];
    }[] = [];

    paydays.forEach((payday, index) => {
      const nextPayday = paydays[index + 1] || null;
      const periodBills = unpaidBills.filter((bill) => {
        const dueDate = new Date(bill.due_date + 'T12:00:00');
        const startDate = index === 0 ? new Date() : payday;
        startDate.setHours(0, 0, 0, 0);

        if (nextPayday) {
          return dueDate >= startDate && dueDate < nextPayday;
        } else {
          // For the last period, include bills due within 30 days of payday
          const endDate = new Date(payday);
          endDate.setDate(endDate.getDate() + 30);
          return dueDate >= startDate && dueDate < endDate;
        }
      });

      groups.push({
        paydayDate: payday,
        nextPaydayDate: nextPayday,
        bills: periodBills.sort(
          (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ),
      });
    });

    return groups;
  }, [settings, unpaidBills]);

  // Bills that don't fit in any period (far future)
  const laterBills = useMemo(() => {
    if (!settings || !settings.lastPayday || paycheckGroups.length === 0) return [];

    const allGroupedBillIds = new Set(
      paycheckGroups.flatMap((g) => g.bills.map((b) => b.id))
    );

    return unpaidBills.filter((bill) => !allGroupedBillIds.has(bill.id));
  }, [settings, paycheckGroups, unpaidBills]);

  // Combined loading state
  const isLoading = isAuthLoading || billsLoading || !isLoaded;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
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
                href="/dashboard/paycheck"
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <Wallet className="w-5 h-5" />
                Paycheck
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
        {!isGmailConnected && (
          <div className="p-4 border-t border-white/5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/10 border border-white/5">
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
        )}

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
        <header className="sticky top-0 z-40 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            {/* Back button (mobile) */}
            <Link
              href="/dashboard"
              className="lg:hidden flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Title */}
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-violet-400 hidden lg:block" />
              <h1 className="text-lg font-semibold text-white">Paycheck Planning</h1>
            </div>

            {/* Settings button */}
            {hasSettings && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-colors text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            {!hasSettings && <div className="w-10" />}
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 pb-24 lg:pb-6">
          {/* Settings panel (collapsible) */}
          {showSettings && hasSettings && (
            <div className="mb-6 p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <CalendarDays className="w-5 h-5 text-violet-400" />
                <h2 className="text-base font-semibold text-white">Paycheck Settings</h2>
              </div>
              <PaycheckSettingsForm
                initialSettings={settings}
                onSave={(newSettings) => {
                  saveSettings(newSettings);
                  setShowSettings(false);
                }}
                onCancel={() => setShowSettings(false)}
              />
            </div>
          )}

          {/* Empty state - no settings */}
          {!hasSettings && (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-violet-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Plan Bills Around Your Paycheck
                </h2>
                <p className="text-zinc-400">
                  Set up your paycheck schedule to see which bills are due before each payday
                  and track your remaining balance.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10">
                <PaycheckSettingsForm
                  initialSettings={null}
                  onSave={saveSettings}
                />
              </div>
            </div>
          )}

          {/* Bills by paycheck view */}
          {hasSettings && !showSettings && (
            <div className="space-y-4">
              {/* Summary card */}
              {paycheckGroups.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/20">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <div>
                      <p className="text-sm text-zinc-300">
                        Showing bills for your next{' '}
                        <span className="font-semibold text-white">
                          {paycheckGroups.length} paycheck{paycheckGroups.length !== 1 ? 's' : ''}
                        </span>
                      </p>
                      {settings?.estimatedAmount && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {formatCurrency(settings.estimatedAmount)} estimated per paycheck
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Paycheck period cards */}
              {paycheckGroups.map((group, index) => (
                <PaycheckPeriodCard
                  key={group.paydayDate.toISOString()}
                  paydayDate={group.paydayDate}
                  nextPaydayDate={group.nextPaydayDate}
                  bills={group.bills}
                  estimatedAmount={settings?.estimatedAmount ?? null}
                  isFirst={index === 0}
                />
              ))}

              {/* Later bills section */}
              {laterBills.length > 0 && (
                <div className="rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-3 p-4 border-b border-white/5">
                    <div className="w-11 h-11 rounded-xl bg-zinc-500/20 border border-zinc-500/30 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">Later</p>
                      <p className="text-xs text-zinc-500">
                        {laterBills.length} bill{laterBills.length !== 1 ? 's' : ''} further out
                      </p>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {laterBills.slice(0, 5).map((bill) => (
                      <PaycheckBillRow key={bill.id} bill={bill} />
                    ))}
                    {laterBills.length > 5 && (
                      <p className="text-xs text-zinc-500 text-center py-2">
                        +{laterBills.length - 5} more bills
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* No bills state */}
              {paycheckGroups.every((g) => g.bills.length === 0) && laterBills.length === 0 && (
                <div className="text-center py-12">
                  <PartyPopper className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No upcoming bills!
                  </h3>
                  <p className="text-zinc-400">
                    All your bills are paid or you haven&apos;t added any yet.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-violet-500 text-white font-medium hover:bg-violet-600 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
