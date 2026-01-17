'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Settings,
  TrendingUp,
  Sparkles,
  Clock,
} from 'lucide-react';
import { Bill, PaycheckSettings, PaycheckSummary, PaycheckRiskLevel } from '@/types';
import { calculatePaycheckSummary, formatPayday } from '@/lib/paycheck-utils';
import { cn } from '@/lib/utils';

interface PaycheckSummaryCardProps {
  bills: Bill[];
  settings: PaycheckSettings;
}

const riskConfig: Record<PaycheckRiskLevel, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelWithBills: string; // Alternative label when bills are due before payday
  sublabel: string;
  sublabelWithBills: string;
  gradient: string;
  glow: string;
  textClass: string;
  accentClass: string;
}> = {
  safe: {
    icon: CheckCircle2,
    label: 'You\'re all set',
    labelWithBills: 'Bills coming up',
    sublabel: 'Bills covered with room to spare',
    sublabelWithBills: 'Pay these before payday',
    gradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    glow: 'bg-emerald-500/30',
    textClass: 'text-emerald-400',
    accentClass: 'border-emerald-500/30 bg-emerald-500/10',
  },
  tight: {
    icon: AlertTriangle,
    label: 'Budget is tight',
    labelWithBills: 'Budget is tight',
    sublabel: 'Consider holding off on extras',
    sublabelWithBills: 'Bills due before you get paid',
    gradient: 'from-amber-500/20 via-amber-500/10 to-transparent',
    glow: 'bg-amber-500/30',
    textClass: 'text-amber-400',
    accentClass: 'border-amber-500/30 bg-amber-500/10',
  },
  short: {
    icon: AlertCircle,
    label: 'Over budget',
    labelWithBills: 'Over budget',
    sublabel: 'Bills exceed your paycheck',
    sublabelWithBills: 'Bills exceed your paycheck',
    gradient: 'from-rose-500/20 via-rose-500/10 to-transparent',
    glow: 'bg-rose-500/30',
    textClass: 'text-rose-400',
    accentClass: 'border-rose-500/30 bg-rose-500/10',
  },
};

export function PaycheckSummaryCard({ bills, settings }: PaycheckSummaryCardProps) {
  const summary = useMemo<PaycheckSummary>(() => {
    return calculatePaycheckSummary(bills, settings);
  }, [bills, settings]);

  const risk = summary.riskLevel ? riskConfig[summary.riskLevel] : null;
  const RiskIcon = risk?.icon;
  const hasUrgentBills = summary.billsBeforePayday > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Ambient glow effects */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/[0.07] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      {/* Top accent line with gradient */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

      {/* Mesh pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50 pointer-events-none" />

      <div className="relative p-6">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Animated wallet icon */}
            <div className="relative group">
              <div className="absolute inset-0 bg-emerald-500/40 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
                <Wallet className="w-6 h-6 text-white" />
                {/* Sparkle accent */}
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-emerald-300 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Paycheck Mode</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Active
                </span>
              </div>
              <p className="text-sm text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                Next payday: <span className="text-emerald-400 font-semibold">{formatPayday(summary.nextPayday)}</span>
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/settings"
            className="p-2.5 text-zinc-500 hover:text-white hover:bg-white/[0.08] rounded-xl transition-all duration-200 hover:scale-105"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        {/* Stats Grid - Asymmetric layout */}
        <div className="grid grid-cols-5 gap-4 mb-5">
          {/* Before Payday - Larger, more urgent */}
          <div className={cn(
            "col-span-3 relative overflow-hidden p-5 rounded-2xl transition-all duration-300",
            hasUrgentBills
              ? "bg-gradient-to-br from-rose-500/[0.12] to-rose-500/[0.04] border border-rose-500/20 hover:border-rose-500/30"
              : "bg-gradient-to-br from-emerald-500/[0.08] to-emerald-500/[0.02] border border-emerald-500/20"
          )}>
            {/* Pulsing indicator for urgent bills */}
            {hasUrgentBills && (
              <div className="absolute top-4 right-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                "w-2 h-2 rounded-full",
                hasUrgentBills ? "bg-rose-400" : "bg-emerald-400"
              )} />
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider",
                hasUrgentBills ? "text-rose-400/90" : "text-emerald-400/90"
              )}>
                Before Payday
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-4xl font-black tabular-nums",
                hasUrgentBills ? "text-white" : "text-emerald-400"
              )}>
                {summary.billsBeforePayday}
              </span>
              <span className="text-zinc-400 font-medium">
                {summary.billsBeforePayday === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            <p className={cn(
              "text-sm font-semibold mt-1",
              hasUrgentBills ? "text-rose-300/80" : "text-emerald-300/60"
            )}>
              ${summary.totalBeforePayday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>

            {hasUrgentBills && (
              <p className="text-xs text-rose-400/60 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Due before you get paid
              </p>
            )}
          </div>

          {/* After Payday - Smaller, muted */}
          <div className="col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-zinc-500" />
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                After Payday
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-500 tabular-nums">
                {summary.billsAfterPayday}
              </span>
              <span className="text-zinc-600 text-sm">
                {summary.billsAfterPayday === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            <p className="text-xs text-zinc-600 font-medium mt-1">
              ${summary.totalAfterPayday.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Money Remaining - Hero Section */}
        {summary.moneyLeft !== null && risk && RiskIcon && (
          <div className={cn(
            "relative overflow-hidden rounded-2xl border p-5 transition-all duration-500",
            risk.accentClass
          )}>
            {/* Ambient glow based on status */}
            <div className={cn(
              "absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40 pointer-events-none",
              risk.glow
            )} />

            {/* Gradient overlay */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-r opacity-50 pointer-events-none",
              risk.gradient
            )} />

            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Status icon with glow */}
                <div className="relative">
                  <div className={cn(
                    "absolute inset-0 rounded-xl blur-lg opacity-50",
                    risk.glow
                  )} />
                  <div className={cn(
                    "relative p-3 rounded-xl border",
                    risk.accentClass
                  )}>
                    <RiskIcon className={cn("w-6 h-6", risk.textClass)} />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">
                    {hasUrgentBills ? risk.labelWithBills : risk.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    {summary.moneyLeft >= 0 ? (
                      <>
                        <span className={cn("text-3xl font-black tabular-nums", risk.textClass)}>
                          ${summary.moneyLeft.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-zinc-400 text-sm font-medium">remaining</span>
                      </>
                    ) : (
                      <>
                        <span className={cn("text-3xl font-black tabular-nums", risk.textClass)}>
                          ${Math.abs(summary.moneyLeft).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-zinc-400 text-sm font-medium">over budget</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {hasUrgentBills ? risk.sublabelWithBills : risk.sublabel}
                  </p>
                </div>
              </div>

              {/* Contextual indicator */}
              {hasUrgentBills && summary.riskLevel === 'safe' ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-medium text-zinc-400">
                    {summary.billsBeforePayday} due soon
                  </span>
                </div>
              ) : summary.riskLevel === 'safe' ? (
                <div className={cn("px-4 py-2 rounded-xl border", risk.accentClass)}>
                  <TrendingUp className={cn("w-5 h-5", risk.textClass)} />
                </div>
              ) : summary.riskLevel === 'tight' ? (
                <div className={cn("px-3 py-2 rounded-xl border", risk.accentClass)}>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", risk.textClass)}>
                    Caution
                  </span>
                </div>
              ) : (
                <div className={cn("px-3 py-2 rounded-xl border", risk.accentClass)}>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", risk.textClass)}>
                    Action needed
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prompt to set amount if not set */}
        {summary.moneyLeft === null && (
          <Link
            href="/dashboard/settings"
            className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] border-dashed hover:border-emerald-500/30 hover:from-emerald-500/[0.05] transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.04] group-hover:bg-emerald-500/10 transition-colors">
                <Wallet className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                  Add your paycheck amount
                </p>
                <p className="text-xs text-zinc-500">See how much you&apos;ll have left after bills</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-200" />
          </Link>
        )}
      </div>
    </div>
  );
}
