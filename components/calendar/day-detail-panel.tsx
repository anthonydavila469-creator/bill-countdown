'use client';

import { X, Plus, CreditCard, RefreshCw, ArrowRight, Calendar } from 'lucide-react';
import { Bill, BillUrgency } from '@/types';
import { ProjectedBill } from '@/lib/calendar-utils';
import { cn, formatCurrency, getDaysUntilDue, getUrgency } from '@/lib/utils';

interface DayDetailPanelProps {
  date: Date;
  bills: (Bill | ProjectedBill)[];
  onClose: () => void;
  onBillClick: (bill: Bill | ProjectedBill) => void;
  onAddBill: (date: Date) => void;
}

// Map urgency to CSS variable name
const urgencyVarMap: Record<BillUrgency, string> = {
  overdue: '--urgency-overdue',
  urgent: '--urgency-urgent',
  soon: '--urgency-soon',
  safe: '--urgency-safe',
  distant: '--urgency-distant',
};

export function DayDetailPanel({
  date,
  bills,
  onClose,
  onBillClick,
  onAddBill,
}: DayDetailPanelProps) {
  // Format date parts
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = date.getFullYear();

  const billCount = bills.length;
  const projectedCount = bills.filter(
    (b) => 'isProjected' in b && b.isProjected
  ).length;
  const actualCount = billCount - projectedCount;

  // Calculate total amount
  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 xl:relative xl:inset-auto">
      {/* Mobile backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md xl:hidden animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-full max-w-md',
          'xl:relative xl:w-[380px] xl:min-w-[380px]',
          'bg-[#0a0a0f]/95 backdrop-blur-2xl',
          'border-l border-white/[0.06] xl:border xl:rounded-2xl',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300 xl:fade-in xl:slide-in-from-right-0'
        )}
      >
        {/* Decorative gradient at top */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-violet-500/5 to-transparent pointer-events-none rounded-t-2xl" />

        {/* Header */}
        <div className="relative p-6 border-b border-white/[0.06]">
          <div className="flex items-start justify-between">
            <div>
              {/* Day of week */}
              <p className="text-sm font-medium text-violet-400 mb-1">{dayOfWeek}</p>
              {/* Date */}
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-light text-white tracking-tight">{monthDay}</h3>
                <span className="text-sm text-zinc-500">{year}</span>
              </div>
              {/* Bill summary */}
              <p className="text-sm text-zinc-500 mt-2">
                {billCount === 0 ? (
                  'No bills scheduled'
                ) : (
                  <>
                    <span className="text-zinc-300 font-medium">{actualCount}</span>
                    {actualCount === 1 ? ' bill' : ' bills'} due
                    {projectedCount > 0 && (
                      <span className="text-zinc-600"> · {projectedCount} projected</span>
                    )}
                  </>
                )}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Total amount badge */}
          {totalAmount > 0 && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Total Due</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bills list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-500 mb-1">No bills on this day</p>
              <p className="text-sm text-zinc-600">Add a bill to get started</p>
            </div>
          ) : (
            bills.map((bill, index) => {
              const daysLeft = getDaysUntilDue(bill.due_date);
              const urgency = getUrgency(daysLeft);
              const isProjected = 'isProjected' in bill && bill.isProjected;
              const cssVar = urgencyVarMap[urgency];

              return (
                <button
                  key={bill.id}
                  onClick={() => onBillClick(bill)}
                  className={cn(
                    'group w-full relative flex items-center gap-4 p-4 rounded-xl',
                    'bg-white/[0.02] border border-white/[0.06]',
                    'hover:bg-white/[0.04] hover:border-white/[0.1]',
                    'transition-all duration-300',
                    'text-left',
                    isProjected && 'border-dashed',
                    'animate-in fade-in slide-in-from-bottom-2 duration-300'
                  )}
                  style={{ animationDelay: `${index * 75}ms` }}
                >
                  {/* Urgency gradient bar */}
                  <div
                    className={cn(
                      'absolute left-0 top-3 bottom-3 w-1 rounded-full',
                      isProjected && 'opacity-40'
                    )}
                    style={{
                      background: `linear-gradient(to bottom, var(${cssVar}), color-mix(in srgb, var(${cssVar}) 70%, black))`,
                    }}
                  />

                  {/* Emoji container */}
                  <div
                    className={cn(
                      'relative w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
                      'bg-white/[0.03] border border-white/[0.06]',
                      'group-hover:scale-105 transition-transform duration-300',
                      isProjected && 'opacity-60'
                    )}
                  >
                    {bill.emoji}
                    {/* Projected indicator */}
                    {isProjected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center">
                        <RefreshCw className="w-2.5 h-2.5 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  {/* Bill info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={cn(
                          'font-medium text-white truncate',
                          isProjected && 'text-zinc-300'
                        )}
                      >
                        {bill.name}
                      </h4>
                      {isProjected && (
                        <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Projected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      {bill.amount && (
                        <span className="font-medium text-zinc-300">
                          {formatCurrency(bill.amount)}
                        </span>
                      )}
                      {bill.is_autopay && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="text-xs">Auto</span>
                        </span>
                      )}
                      {bill.is_recurring && !isProjected && (
                        <span className="flex items-center gap-1 text-zinc-500">
                          <RefreshCw className="w-3 h-3" />
                          <span className="text-xs capitalize">{bill.recurrence_interval}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>
              );
            })
          )}
        </div>

        {/* Add bill button */}
        <div className="p-4 border-t border-white/[0.06]">
          <button
            onClick={() => onAddBill(date)}
            className="group relative w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl overflow-hidden transition-all duration-300 hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {/* Shine effect on hover */}
            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />

            {/* Content */}
            <Plus className="w-5 h-5 text-white relative z-10" />
            <span className="text-white font-medium relative z-10">Add Bill for This Day</span>
          </button>
        </div>
      </div>
    </div>
  );
}
