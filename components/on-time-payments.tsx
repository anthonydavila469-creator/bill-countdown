'use client';

import { useMemo } from 'react';
import { Bill } from '@/types';
import { Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnTimePaymentsProps {
  bills: Bill[];
  className?: string;
}

export function OnTimePayments({ bills, className }: OnTimePaymentsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get bills paid in last 30 days
    const paidLast30Days = bills.filter(bill => {
      if (!bill.paid_at || !bill.is_paid) return false;
      const paidDate = new Date(bill.paid_at);
      return paidDate >= thirtyDaysAgo && paidDate <= now;
    });

    // Count bills paid on or before due date
    const onTimeCount = paidLast30Days.filter(bill => {
      if (!bill.paid_at) return false;
      const paidDate = new Date(bill.paid_at);
      paidDate.setHours(0, 0, 0, 0);
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return paidDate <= dueDate;
    }).length;

    const totalPaidCount = paidLast30Days.length;
    const isPerfectMonth = totalPaidCount > 0 && onTimeCount === totalPaidCount;

    return {
      onTimeCount,
      totalPaidCount,
      isPerfectMonth,
    };
  }, [bills]);

  // Hide widget entirely if no on-time bills
  if (stats.onTimeCount === 0) {
    return null;
  }

  const isProminent = stats.onTimeCount >= 3;

  return (
    <div
      className={cn(
        'relative p-4 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500',
        isProminent
          ? 'bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-yellow-500/5 border border-orange-500/25'
          : 'bg-white/[0.02] border border-white/[0.06]',
        className
      )}
    >
      {/* Glow effect for prominent display */}
      {isProminent && (
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl" />
      )}

      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          stats.isPerfectMonth
            ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/40'
            : isProminent
            ? 'bg-gradient-to-br from-orange-500/25 to-amber-500/15 border border-orange-500/30'
            : 'bg-white/[0.04] border border-white/[0.08]'
        )}>
          {stats.isPerfectMonth ? (
            <Trophy className="w-5 h-5 text-amber-400" />
          ) : (
            <Flame className={cn(
              'w-5 h-5',
              isProminent ? 'text-orange-400' : 'text-zinc-400'
            )} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {stats.isPerfectMonth ? (
            <>
              <p className="text-sm font-semibold text-amber-200">
                Perfect month!
              </p>
              <p className="text-xs text-amber-400/70">
                All {stats.totalPaidCount} bill{stats.totalPaidCount !== 1 ? 's' : ''} paid on time
              </p>
            </>
          ) : (
            <>
              <p className={cn(
                'text-sm font-semibold',
                isProminent ? 'text-orange-200' : 'text-zinc-300'
              )}>
                {stats.onTimeCount} bill{stats.onTimeCount !== 1 ? 's' : ''} paid on time
              </p>
              <p className={cn(
                'text-xs',
                isProminent ? 'text-orange-400/70' : 'text-zinc-500'
              )}>
                Last 30 days
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
