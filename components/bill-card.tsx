'use client';

import { Bill } from '@/types';
import {
  cn,
  getDaysUntilDue,
  getUrgency,
  formatDate,
  formatCurrency,
  getPriceChange,
} from '@/lib/utils';
import { GradientCard } from './ui/gradient-card';
import { CountdownDisplay } from './countdown-display';
import { RefreshCw, Calendar, DollarSign, ExternalLink, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';

interface BillCardProps {
  bill: Bill;
  onClick?: () => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function BillCard({
  bill,
  onClick,
  variant = 'default',
  className,
}: BillCardProps) {
  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgency = getUrgency(daysLeft);
  const priceChange = getPriceChange(bill.amount, bill.previous_amount);

  if (variant === 'compact') {
    return (
      <GradientCard
        urgency={urgency}
        onClick={onClick}
        className={cn('p-4', className)}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left side: emoji + name */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{bill.emoji}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">{bill.name}</h3>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(bill.due_date)}
              </p>
            </div>
          </div>

          {/* Right side: countdown */}
          <CountdownDisplay
            daysLeft={daysLeft}
            urgency={urgency}
            size="sm"
          />
        </div>
      </GradientCard>
    );
  }

  return (
    <GradientCard
      urgency={urgency}
      onClick={onClick}
      className={cn('p-6', className)}
    >
      <div className="flex flex-col h-full min-h-[180px]">
        {/* Top section: emoji + name */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className="text-3xl p-2 rounded-2xl bg-white/20 backdrop-blur-sm"
              role="img"
              aria-label={bill.category || 'bill'}
            >
              {bill.emoji}
            </span>
            <div>
              <h3 className="font-bold text-lg text-white leading-tight">
                {bill.name}
              </h3>
              {bill.amount && (
                <p className="text-white/80 text-sm font-medium flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {formatCurrency(bill.amount).replace('$', '')}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-1.5 items-end">
            {/* Autopay badge */}
            {bill.is_autopay && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/30 backdrop-blur-sm"
                title="Autopay enabled"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-xs font-medium text-emerald-100">
                  Autopay
                </span>
              </div>
            )}

            {/* Recurring badge */}
            {bill.is_recurring && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm"
                title={`Repeats ${bill.recurrence_interval}`}
              >
                <RefreshCw className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-medium text-white capitalize">
                  {bill.recurrence_interval}
                </span>
              </div>
            )}

            {/* Price change badge */}
            {priceChange && (
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm',
                  priceChange.isIncrease
                    ? 'bg-rose-500/30'
                    : 'bg-emerald-500/30'
                )}
                title={`Price ${priceChange.isIncrease ? 'increased' : 'decreased'} by ${formatCurrency(priceChange.amount)}`}
              >
                {priceChange.isIncrease ? (
                  <TrendingUp className="w-3 h-3 text-rose-200" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-emerald-200" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    priceChange.isIncrease ? 'text-rose-100' : 'text-emerald-100'
                  )}
                >
                  {priceChange.isIncrease ? '+' : '-'}
                  {priceChange.percentage.toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center section: countdown (hero element) */}
        <div className="flex-1 flex items-center justify-center py-4">
          <CountdownDisplay
            daysLeft={daysLeft}
            urgency={urgency}
            size="lg"
          />
        </div>

        {/* Bottom section: due date */}
        <div className="flex items-center justify-between pt-2 border-t border-white/20">
          <div className="flex items-center gap-2 text-white/80">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">
              {formatDate(bill.due_date)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Payment link indicator */}
            {bill.payment_url && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/80">
                <ExternalLink className="w-3 h-3" />
                Pay
              </span>
            )}

            {/* Source indicator */}
            {bill.source === 'gmail' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white/80">
                from email
              </span>
            )}
          </div>
        </div>
      </div>
    </GradientCard>
  );
}

// Map urgency to CSS variable name
const urgencyVarMap = {
  overdue: '--urgency-overdue',
  urgent: '--urgency-urgent',
  soon: '--urgency-soon',
  safe: '--urgency-safe',
  distant: '--urgency-distant',
};

// List item variant for the bills list view
export function BillListItem({
  bill,
  onClick,
  className,
}: BillCardProps) {
  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgency = getUrgency(daysLeft);
  const priceChange = getPriceChange(bill.amount, bill.previous_amount);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl',
        'border border-zinc-200 dark:border-zinc-800',
        'shadow-sm hover:shadow-md transition-all duration-200',
        'hover:-translate-y-0.5 cursor-pointer',
        className
      )}
    >
      {/* Urgency color bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{ backgroundColor: `var(${urgencyVarMap[urgency]})` }}
      />

      {/* Emoji */}
      <span className="text-2xl pl-2">{bill.emoji}</span>

      {/* Bill info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
            {bill.name}
          </h3>
          {bill.is_autopay && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-3 h-3" />
              <span className="text-[10px] font-medium">Auto</span>
            </span>
          )}
          {bill.is_recurring && (
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          )}
          {bill.payment_url && (
            <ExternalLink className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          )}
          {priceChange && (
            <span
              className={cn(
                'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                priceChange.isIncrease
                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              )}
            >
              {priceChange.isIncrease ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {priceChange.isIncrease ? '+' : '-'}{priceChange.percentage.toFixed(0)}%
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {formatDate(bill.due_date)}
          {bill.amount && ` • ${formatCurrency(bill.amount)}`}
        </p>
      </div>

      {/* Countdown */}
      <div
        className="text-right px-3 py-1.5 rounded-xl"
        style={{
          backgroundColor: `color-mix(in srgb, var(${urgencyVarMap[urgency]}) 15%, transparent)`,
        }}
      >
        <span
          className="text-2xl font-bold"
          style={{ color: `var(${urgencyVarMap[urgency]})` }}
        >
          {Math.abs(daysLeft)}
        </span>
        <p
          className="text-xs font-medium"
          style={{ color: `var(${urgencyVarMap[urgency]})` }}
        >
          {daysLeft < 0 ? 'days ago' : daysLeft === 0 ? 'today' : 'days left'}
        </p>
      </div>
    </div>
  );
}
