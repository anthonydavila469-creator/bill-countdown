'use client';

import { useMemo, useState } from 'react';
import { Bill, PaycheckSettings } from '@/types';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingDown,
  Wallet,
  Calendar,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashFlowProjectionProps {
  bills: Bill[];
  settings: PaycheckSettings;
  className?: string;
}

interface ProjectionPoint {
  date: Date;
  billName: string;
  amount: number;
  balance: number;
}

export function CashFlowProjection({
  bills,
  settings,
  className,
}: CashFlowProjectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const projection = useMemo(() => {
    if (!settings.amount || !settings.next_payday) {
      return null;
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    const paydayDate = new Date(settings.next_payday);
    paydayDate.setHours(0, 0, 0, 0);

    // Get unpaid bills due before payday
    const billsBeforePayday = bills.filter(bill => {
      if (bill.is_paid) return false;
      const dueDate = new Date(bill.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= startDate && dueDate <= paydayDate;
    });

    // Sort by due date
    const sortedBills = [...billsBeforePayday].sort((a, b) => {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    // Calculate projection points
    let currentBalance = settings.amount;
    const points: ProjectionPoint[] = [];
    let firstNegativeDate: Date | null = null;
    let shortfallAmount = 0;

    for (const bill of sortedBills) {
      const amount = bill.amount || 0;
      currentBalance -= amount;

      points.push({
        date: new Date(bill.due_date),
        billName: bill.name,
        amount,
        balance: currentBalance,
      });

      if (currentBalance < 0 && !firstNegativeDate) {
        firstNegativeDate = new Date(bill.due_date);
        shortfallAmount = Math.abs(currentBalance);
      }
    }

    const totalBillsDue = sortedBills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const remainingBalance = settings.amount - totalBillsDue;

    return {
      startingAmount: settings.amount,
      totalBillsDue,
      remainingBalance,
      points,
      hasShortfall: remainingBalance < 0,
      shortfallAmount: Math.abs(Math.min(0, remainingBalance)),
      firstNegativeDate,
      paydayDate,
    };
  }, [bills, settings]);

  // Don't render if no paycheck amount set
  if (!settings.amount) {
    return null;
  }

  if (!projection) return null;

  const percentRemaining = (projection.remainingBalance / projection.startingAmount) * 100;
  const percentUsed = Math.min(100, Math.max(0, 100 - percentRemaining));

  // Format dates
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={cn('mt-3', className)}>
      {/* Collapsible header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-black/20 backdrop-blur-sm hover:bg-black/30 transition-all duration-200"
      >
        <div className="flex items-center gap-2.5">
          <TrendingDown className={cn(
            'w-4 h-4',
            projection.hasShortfall ? 'text-rose-300' : 'text-white/70'
          )} />
          <span className="text-sm font-medium text-white">Balance Projection</span>
          {projection.hasShortfall && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-[10px] font-bold text-rose-300 uppercase">
              <AlertTriangle className="w-3 h-3" />
              Shortfall
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-semibold',
            projection.hasShortfall ? 'text-rose-300' : 'text-emerald-300'
          )}>
            {projection.hasShortfall ? '-' : ''}${Math.abs(projection.remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/50" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/50" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-2 p-4 rounded-xl bg-black/15 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Progress bar visualization */}
          <div className="mb-4">
            <div className="h-3 rounded-full bg-white/10 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  projection.hasShortfall
                    ? 'bg-rose-400'
                    : percentRemaining > 50
                    ? 'bg-emerald-400'
                    : percentRemaining > 20
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                )}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-white/50">
              <span>$0</span>
              <span>${projection.startingAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Summary breakdown */}
          <div className="space-y-2 text-sm">
            {/* Pay period */}
            <div className="flex items-center justify-between text-white/60">
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Pay Period
              </span>
              <span>Today → {formatDate(projection.paydayDate)}</span>
            </div>

            {/* Starting balance */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-white/80">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Starting
              </span>
              <span className="font-semibold text-white">
                ${projection.startingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Bills due */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-white/80">
                <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                Bills Due
              </span>
              <span className="font-semibold text-rose-300">
                -${projection.totalBillsDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 my-2" />

            {/* Remaining */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-white">
                <ArrowRight className="w-3.5 h-3.5" />
                Remaining
              </span>
              <span className={cn(
                'font-bold text-lg',
                projection.hasShortfall ? 'text-rose-300' : 'text-emerald-300'
              )}>
                {projection.hasShortfall ? '-' : ''}${Math.abs(projection.remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Shortfall warning */}
          {projection.hasShortfall && projection.firstNegativeDate && (
            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/25">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <p className="text-xs text-rose-200">
                Shortfall of <span className="font-semibold">${projection.shortfallAmount.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span> projected on {formatDate(projection.firstNegativeDate)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
