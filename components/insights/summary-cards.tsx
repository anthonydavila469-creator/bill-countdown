'use client';

import { TrendingUp, TrendingDown, Minus, Wallet, ArrowLeftRight } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

interface SummaryCardsProps {
  currentTotal: number;
  previousTotal: number;
  currentMonthLabel: string;
  previousMonthLabel: string;
  isFirstMonth: boolean;
}

export function SummaryCards({
  currentTotal,
  previousTotal,
  currentMonthLabel,
  previousMonthLabel,
  isFirstMonth,
}: SummaryCardsProps) {
  const difference = currentTotal - previousTotal;
  const isIncrease = difference > 0;
  const isDecrease = difference < 0;
  const noChange = difference === 0;
  const percentChange = previousTotal > 0 ? Math.abs((difference / previousTotal) * 100).toFixed(0) : 0;

  return (
    <>
      {/* Mobile: Compact layout */}
      <div className="md:hidden space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Side by side month cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Month */}
          <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/25 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-emerald-500/20 rounded-full blur-2xl" />
            <div className="relative">
              <p className="text-[10px] text-emerald-400 font-semibold tracking-wide uppercase mb-1">
                {currentMonthLabel}
              </p>
              <p className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(currentTotal)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">This month</p>
            </div>
          </div>

          {/* Previous Month */}
          <div className="relative p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
            <div className="relative">
              <p className="text-[10px] text-zinc-400 font-semibold tracking-wide uppercase mb-1">
                {previousMonthLabel}
              </p>
              <p className="text-2xl font-bold text-zinc-300 tracking-tight">
                {isFirstMonth ? '—' : formatCurrency(previousTotal)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {isFirstMonth ? 'First month' : 'Last month'}
              </p>
            </div>
          </div>
        </div>

        {/* Difference bar */}
        {!isFirstMonth && (
          <div className={cn(
            'flex items-center justify-between p-3 rounded-xl border',
            isIncrease && 'bg-rose-500/10 border-rose-500/25',
            isDecrease && 'bg-emerald-500/10 border-emerald-500/25',
            noChange && 'bg-white/[0.03] border-white/[0.08]'
          )}>
            <div className="flex items-center gap-2">
              {isIncrease && <TrendingUp className="w-4 h-4 text-rose-400" />}
              {isDecrease && <TrendingDown className="w-4 h-4 text-emerald-400" />}
              {noChange && <Minus className="w-4 h-4 text-zinc-400" />}
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">vs Last Month</span>
                <span className={cn(
                  'font-bold text-sm',
                  isIncrease && 'text-rose-400',
                  isDecrease && 'text-emerald-400',
                  noChange && 'text-zinc-400'
                )}>
                  {noChange ? 'No change' : `${isIncrease ? '+' : ''}${formatCurrency(difference)}`}
                </span>
              </div>
            </div>
            <span className={cn(
              'text-sm font-medium',
              isIncrease && 'text-rose-400',
              isDecrease && 'text-emerald-400',
              noChange && 'text-zinc-400'
            )}>
              {isIncrease && `↑ ${percentChange}%`}
              {isDecrease && `↓ ${percentChange}%`}
              {noChange && '—'}
            </span>
          </div>
        )}
      </div>

      {/* Desktop: Original 3-card layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-4 lg:gap-5">
        {/* This Month Card - Hero card with glow */}
        <div
          className={cn(
            'group relative p-6 rounded-2xl overflow-hidden',
            'bg-gradient-to-br from-emerald-500/15 via-emerald-600/10 to-teal-500/5',
            'border border-emerald-500/25',
            'animate-in fade-in slide-in-from-bottom-4 duration-500'
          )}
          style={{ animationDelay: '0ms', animationFillMode: 'backwards' }}
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors duration-500" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-400/10 to-transparent" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm text-emerald-400/90 font-semibold tracking-wide uppercase">
                {currentMonthLabel}
              </p>
            </div>
            <p className="text-4xl font-bold text-white tracking-tight mb-1">
              {formatCurrency(currentTotal)}
            </p>
            <p className="text-sm text-zinc-400">Total paid this month</p>
          </div>
        </div>

        {/* Last Month Card */}
        <div
          className={cn(
            'group relative p-6 rounded-2xl overflow-hidden',
            'bg-white/[0.02] hover:bg-white/[0.04]',
            'border border-white/[0.06] hover:border-white/10',
            'transition-all duration-300',
            'animate-in fade-in slide-in-from-bottom-4 duration-500'
          )}
          style={{ animationDelay: '75ms', animationFillMode: 'backwards' }}
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <Wallet className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-400 font-semibold tracking-wide uppercase">
                {previousMonthLabel}
              </p>
            </div>
            <p className="text-4xl font-bold text-zinc-300 tracking-tight mb-1">
              {isFirstMonth ? '—' : formatCurrency(previousTotal)}
            </p>
            <p className="text-sm text-zinc-500">
              {isFirstMonth ? 'First month tracked' : 'Total paid last month'}
            </p>
          </div>
        </div>

        {/* Difference Card */}
        <div
          className={cn(
            'group relative p-6 rounded-2xl overflow-hidden',
            'border transition-all duration-300',
            'animate-in fade-in slide-in-from-bottom-4 duration-500',
            isFirstMonth && 'bg-white/[0.02] border-white/[0.06]',
            !isFirstMonth && isIncrease && 'bg-gradient-to-br from-rose-500/10 via-rose-600/5 to-pink-500/5 border-rose-500/25',
            !isFirstMonth && isDecrease && 'bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-teal-500/5 border-emerald-500/25',
            !isFirstMonth && noChange && 'bg-white/[0.02] border-white/[0.06]'
          )}
          style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
        >
          {!isFirstMonth && isIncrease && (
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-500/15 rounded-full blur-3xl" />
          )}
          {!isFirstMonth && isDecrease && (
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl" />
          )}
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className={cn(
                'p-2 rounded-xl border',
                isFirstMonth && 'bg-white/5 border-white/10',
                !isFirstMonth && isIncrease && 'bg-rose-500/20 border-rose-500/30',
                !isFirstMonth && isDecrease && 'bg-emerald-500/20 border-emerald-500/30',
                !isFirstMonth && noChange && 'bg-white/5 border-white/10'
              )}>
                <ArrowLeftRight className={cn(
                  'w-4 h-4',
                  isFirstMonth && 'text-zinc-400',
                  !isFirstMonth && isIncrease && 'text-rose-400',
                  !isFirstMonth && isDecrease && 'text-emerald-400',
                  !isFirstMonth && noChange && 'text-zinc-400'
                )} />
              </div>
              <p className="text-sm text-zinc-400 font-semibold tracking-wide uppercase">
                Difference
              </p>
            </div>

            {isFirstMonth ? (
              <>
                <p className="text-4xl font-bold text-zinc-500 tracking-tight mb-1">—</p>
                <p className="text-sm text-zinc-500">No previous data</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1">
                  {isIncrease && <TrendingUp className="w-7 h-7 text-rose-400" />}
                  {isDecrease && <TrendingDown className="w-7 h-7 text-emerald-400" />}
                  {noChange && <Minus className="w-7 h-7 text-zinc-400" />}
                  <p className={cn(
                    'text-4xl font-bold tracking-tight',
                    isIncrease && 'text-rose-400',
                    isDecrease && 'text-emerald-400',
                    noChange && 'text-zinc-400'
                  )}>
                    {noChange ? '$0' : `${isIncrease ? '+' : '-'}${formatCurrency(Math.abs(difference)).replace('$', '')}`}
                  </p>
                </div>
                <p className="text-sm text-zinc-400">
                  {isIncrease && `${percentChange}% more than last month`}
                  {isDecrease && `${percentChange}% less than last month`}
                  {noChange && 'Same as last month'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
