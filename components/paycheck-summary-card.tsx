'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Wallet,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Settings,
  X,
  ChevronDown,
} from 'lucide-react';
import { Bill, PaycheckSettings, PaycheckSummary, PaycheckRiskLevel, PaySchedule, DEFAULT_PAYCHECK_SETTINGS } from '@/types';
import { calculatePaycheckSummary, formatPayday } from '@/lib/paycheck-utils';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/theme-context';

interface PaycheckSummaryCardProps {
  bills: Bill[];
  settings: PaycheckSettings;
}

const SCHEDULE_OPTIONS: { value: PaySchedule; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const riskConfig: Record<PaycheckRiskLevel, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  iconClass: string;
  badgeClass: string;
  badgeText: string;
}> = {
  safe: {
    icon: CheckCircle2,
    label: 'remaining',
    iconClass: 'text-white',
    badgeClass: 'bg-white/20 text-white border-white/30',
    badgeText: 'On Track',
  },
  tight: {
    icon: AlertTriangle,
    label: 'remaining',
    iconClass: 'text-amber-300',
    badgeClass: 'bg-amber-400/20 text-amber-200 border-amber-300/30',
    badgeText: 'Tight',
  },
  short: {
    icon: AlertCircle,
    label: 'over budget',
    iconClass: 'text-rose-300',
    badgeClass: 'bg-rose-400/20 text-rose-200 border-rose-300/30',
    badgeText: 'Over',
  },
};

function calculateDaysToPayday(nextPayday: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const paydayDate = new Date(nextPayday);
  const payday = new Date(paydayDate.getFullYear(), paydayDate.getMonth(), paydayDate.getDate());
  const diffTime = payday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function PaycheckSummaryCard({ bills, settings }: PaycheckSummaryCardProps) {
  const { paycheckSettings, updatePaycheckSettings } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState<PaycheckSettings>(
    paycheckSettings ?? DEFAULT_PAYCHECK_SETTINGS
  );
  const [amountInput, setAmountInput] = useState(
    localSettings.amount !== null ? localSettings.amount.toString() : ''
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync local state when context changes
  useEffect(() => {
    if (paycheckSettings) {
      setLocalSettings(paycheckSettings);
      setAmountInput(
        paycheckSettings.amount !== null ? paycheckSettings.amount.toString() : ''
      );
    }
  }, [paycheckSettings]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettings]);

  const handleToggle = async (enabled: boolean) => {
    const newSettings: PaycheckSettings = {
      ...localSettings,
      enabled,
      next_payday: enabled && !localSettings.next_payday ? getTodayYmd() : localSettings.next_payday,
    };
    setLocalSettings(newSettings);
    await updatePaycheckSettings(newSettings);
  };

  const handleScheduleChange = async (schedule: PaySchedule) => {
    const newSettings: PaycheckSettings = { ...localSettings, schedule };
    setLocalSettings(newSettings);
    await updatePaycheckSettings(newSettings);
  };

  const handleDateChange = async (date: string) => {
    const newSettings: PaycheckSettings = { ...localSettings, next_payday: date };
    setLocalSettings(newSettings);
    await updatePaycheckSettings(newSettings);
  };

  const handleAmountBlur = async () => {
    const trimmed = amountInput.trim();
    let amount: number | null = null;
    if (trimmed) {
      const parsed = parseFloat(trimmed.replace(/[$,]/g, ''));
      if (Number.isFinite(parsed) && parsed > 0) {
        amount = parsed;
      }
    }

    if (amount !== localSettings.amount) {
      const newSettings: PaycheckSettings = { ...localSettings, amount };
      setLocalSettings(newSettings);
      await updatePaycheckSettings(newSettings);
    }

    setAmountInput(amount !== null ? amount.toFixed(2) : '');
  };

  function getTodayYmd(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const summary = useMemo<PaycheckSummary>(() => {
    return calculatePaycheckSummary(bills, settings);
  }, [bills, settings]);

  const risk = summary.riskLevel ? riskConfig[summary.riskLevel] : null;
  const RiskIcon = risk?.icon;
  const hasUrgentBills = summary.billsBeforePayday > 0;
  const daysToPayday = calculateDaysToPayday(summary.nextPayday);

  return (
    <div
      className={cn(
        // Base card structure
        'group relative overflow-hidden rounded-3xl',
        // Gradient background
        'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600',
        // Shadow and glow
        'shadow-xl shadow-emerald-500/25',
        // Hover animations
        'transition-all duration-300 ease-out',
        'hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-0.5',
        // Animation
        'animate-in fade-in slide-in-from-bottom-4 duration-700'
      )}
    >
      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Glossy highlight at top */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

      {/* Subtle inner border for glass effect */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/20 pointer-events-none" />

      {/* Animated shine on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Wallet icon */}
            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
              <Wallet className="w-5 h-5 text-white" />
            </div>

            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Paycheck Mode</h3>
              <span className="px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-[10px] font-bold text-white uppercase tracking-wider">
                Active
              </span>
            </div>
          </div>

          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'p-2.5 rounded-xl transition-all duration-200',
                showSettings
                  ? 'text-white bg-white/20'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Settings Popover - positioned to the left of the gear */}
            {showSettings && (
              <div className="absolute right-full top-0 mr-2 w-72 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 z-50 animate-in fade-in slide-in-from-right-2 duration-200">
                {/* Frosted glass background with teal tint */}
                <div className="absolute inset-0 bg-gradient-to-br from-teal-950/95 via-[#0a1414]/98 to-[#0c0c10]/98 backdrop-blur-xl" />
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />

                {/* Content */}
                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20">
                        <Settings className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-white">Paycheck Settings</h4>
                    </div>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="p-1 text-zinc-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Settings Rows */}
                  <div className="p-3 space-y-1">
                    {/* Enabled Toggle */}
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                      <span className="text-sm text-zinc-300">Enabled</span>
                      <button
                        onClick={() => handleToggle(!localSettings.enabled)}
                        className={cn(
                          'relative w-10 h-5 rounded-full transition-all duration-300',
                          localSettings.enabled ? 'bg-emerald-500' : 'bg-white/15'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300',
                            localSettings.enabled ? 'left-5' : 'left-0.5'
                          )}
                        />
                      </button>
                    </div>

                    {/* Pay Schedule */}
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                      <span className="text-sm text-zinc-300">Schedule</span>
                      <div className="relative">
                        <select
                          value={localSettings.schedule}
                          onChange={(e) => handleScheduleChange(e.target.value as PaySchedule)}
                          className="appearance-none pl-3 pr-7 py-1.5 w-36 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer transition-all"
                        >
                          {SCHEDULE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Next Payday */}
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                      <span className="text-sm text-zinc-300">Next Payday</span>
                      <input
                        type="date"
                        value={localSettings.next_payday}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="px-3 py-1.5 w-36 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer transition-all [color-scheme:dark]"
                      />
                    </div>

                    {/* Paycheck Amount */}
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-zinc-300">Amount</span>
                        <span className="text-[10px] text-zinc-500 italic">optional</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                          onBlur={handleAmountBlur}
                          placeholder="0.00"
                          className="pl-7 pr-3 py-1.5 w-28 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-zinc-600 transition-all text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hero Countdown Section - Tightened spacing */}
        <div className="flex flex-col items-center py-2 mb-4">
          {/* Large countdown number */}
          <span
            className="text-6xl md:text-7xl font-black text-white drop-shadow-lg tracking-tight"
            style={{
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            {daysToPayday}
          </span>

          {/* Label */}
          <span className="text-sm font-semibold uppercase tracking-widest text-white/90">
            {daysToPayday === 1 ? 'Day to Payday' : 'Days to Payday'}
          </span>

          {/* Date */}
          <span className="text-base font-medium text-white/70 mt-0.5">
            {formatPayday(summary.nextPayday)}
          </span>
        </div>

        {/* Before/After Grid - Equal halves */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Before Payday */}
          <div className="relative p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20">
            <div className="flex items-center gap-2 mb-2">
              {/* Pulsing dot indicator for urgent bills */}
              {hasUrgentBills ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-white/40" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                Before Payday
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white tabular-nums">
                {summary.billsBeforePayday}
              </span>
              <span className="text-white/80 text-sm font-medium">
                {summary.billsBeforePayday === 1 ? 'bill' : 'bills'}
              </span>
              <span className="text-white/50 text-sm mx-0.5">·</span>
              <span className="text-white font-semibold text-sm">
                ${summary.totalBeforePayday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* After Payday */}
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-white/30" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                After Payday
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white/80 tabular-nums">
                {summary.billsAfterPayday}
              </span>
              <span className="text-white/60 text-sm font-medium">
                {summary.billsAfterPayday === 1 ? 'bill' : 'bills'}
              </span>
              <span className="text-white/40 text-sm mx-0.5">·</span>
              <span className="text-white/70 font-medium text-sm">
                ${summary.totalAfterPayday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Budget Status Bar */}
        {summary.moneyLeft !== null && risk && RiskIcon && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <RiskIcon className={cn('w-4 h-4', risk.iconClass)} />
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-white tabular-nums">
                  ${Math.abs(summary.moneyLeft).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-white/70 text-sm font-medium">
                  {risk.label}
                </span>
              </div>
            </div>

            <div className={cn(
              'px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wider',
              risk.badgeClass
            )}>
              {risk.badgeText}
            </div>
          </div>
        )}

        {/* Prompt to set amount if not set */}
        {summary.moneyLeft === null && (
          <button
            onClick={() => setShowSettings(true)}
            className="group/link w-full flex items-center justify-between p-3 rounded-xl bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-white/70" />
              <div>
                <p className="text-sm font-medium text-white">
                  Add paycheck amount
                </p>
                <p className="text-xs text-white/60">Track what&apos;s left after bills</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/50 group-hover/link:text-white group-hover/link:translate-x-1 transition-all duration-200" />
          </button>
        )}
      </div>
    </div>
  );
}
