'use client';

import { X, Plus, CreditCard, RefreshCw, Calendar, ExternalLink, Check, Pencil, Loader2, Sparkles, ArrowUpRight } from 'lucide-react';
import { Bill, BillUrgency } from '@/types';
import { ProjectedBill } from '@/lib/calendar-utils';
import { cn, formatCurrency, getDaysUntilDue, getUrgency } from '@/lib/utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import { MutationState } from '@/contexts/bills-context';

interface DayDetailPanelProps {
  date: Date;
  bills: (Bill | ProjectedBill)[];
  onClose: () => void;
  onBillClick: (bill: Bill | ProjectedBill) => void;
  onAddBill: (date: Date) => void;
  onMarkPaid?: (bill: Bill) => void;
  onEdit?: (bill: Bill) => void;
  getMutationState?: (billId: string) => MutationState;
}

// Map urgency to CSS variable name
const urgencyVarMap: Record<BillUrgency, string> = {
  overdue: '--urgency-overdue',
  urgent: '--urgency-urgent',
  soon: '--urgency-soon',
  safe: '--urgency-safe',
  distant: '--urgency-distant',
};

// Get smart urgency label based on days left
const getUrgencyLabel = (daysLeft: number): string => {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due tomorrow';
  if (daysLeft <= 7) return `Due in ${daysLeft}d`;
  return `${daysLeft}d left`;
};

export function DayDetailPanel({
  date,
  bills,
  onClose,
  onBillClick,
  onAddBill,
  onMarkPaid,
  onEdit,
  getMutationState,
}: DayDetailPanelProps) {
  // Format date parts
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const year = date.getFullYear();
  const dayNum = date.getDate();

  const billCount = bills.length;
  const projectedCount = bills.filter(
    (b) => 'isProjected' in b && b.isProjected
  ).length;
  const actualCount = billCount - projectedCount;

  // Calculate total amount
  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);

  // Check if this is today
  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <div className="fixed inset-0 z-50 xl:relative xl:inset-auto">
      {/* Mobile backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl xl:hidden animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-full max-w-md',
          'xl:relative xl:w-[400px] xl:min-w-[400px]',
          'bg-[#09090d]/98 backdrop-blur-2xl',
          'border-l border-white/[0.08] xl:border xl:rounded-2xl',
          'flex flex-col overflow-hidden',
          'animate-in slide-in-from-right duration-500 ease-out xl:fade-in xl:slide-in-from-right-0'
        )}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {/* Ambient glow */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/8 rounded-full blur-3xl" />
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '32px 32px'
            }}
          />
        </div>

        {/* Header */}
        <div className="relative p-6 pb-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Date display */}
          <div className="flex items-start gap-4">
            {/* Large day number */}
            <div className={cn(
              'relative w-20 h-20 rounded-2xl flex items-center justify-center',
              'bg-gradient-to-br from-white/[0.08] to-white/[0.02]',
              'border border-white/[0.08]',
              isToday && 'ring-2 ring-blue-500/50 ring-offset-2 ring-offset-[#09090d]'
            )}>
              <span className="text-4xl font-light text-white tracking-tight">{dayNum}</span>
              {isToday && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-500 text-white rounded-full">
                  Today
                </span>
              )}
            </div>

            {/* Date info */}
            <div className="flex-1 pt-1">
              <p className="text-sm font-medium text-violet-400 tracking-wide">{dayOfWeek}</p>
              <h3 className="text-xl font-medium text-white mt-0.5">{monthDay}</h3>
              <p className="text-sm text-zinc-500 mt-1">{year}</p>
            </div>
          </div>

          {/* Bill summary */}
          <div className="flex items-center gap-3 mt-5">
            {billCount === 0 ? (
              <p className="text-sm text-zinc-500">No bills scheduled</p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                  <div className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-sm text-zinc-300">
                    <span className="font-semibold text-white">{actualCount}</span> {actualCount === 1 ? 'bill' : 'bills'} due
                  </span>
                </div>
                {projectedCount > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-dashed border-white/[0.08]">
                    <RefreshCw className="w-3 h-3 text-zinc-500" />
                    <span className="text-sm text-zinc-500">{projectedCount} projected</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Total amount card */}
        {totalAmount > 0 && (
          <div className="mx-6 mb-4">
            <div className="relative p-4 rounded-xl overflow-hidden">
              {/* Card background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/15 via-blue-500/10 to-transparent" />
              <div className="absolute inset-0 bg-white/[0.02]" />
              <div className="absolute inset-[1px] rounded-[11px] border border-white/[0.08]" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/20 flex items-center justify-center border border-white/10">
                    <Sparkles className="w-5 h-5 text-violet-300" />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-medium">Total Due</p>
                    <p className="text-2xl font-semibold text-white tracking-tight mt-0.5">
                      {formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Bills list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-5">
                  <Calendar className="w-9 h-9 text-zinc-600" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-transparent rounded-2xl blur-xl opacity-50" />
              </div>
              <p className="text-zinc-400 font-medium mb-1">No bills on this day</p>
              <p className="text-sm text-zinc-600 max-w-[200px]">Click below to schedule a bill for this date</p>
            </div>
          ) : (
            // Sort: unpaid first, then by urgency
            [...bills]
              .sort((a, b) => {
                if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1;
                const daysA = getDaysUntilDue(a.due_date);
                const daysB = getDaysUntilDue(b.due_date);
                return daysA - daysB;
              })
              .map((bill, index) => {
              const daysLeft = getDaysUntilDue(bill.due_date);
              const urgency = getUrgency(daysLeft);
              const isProjected = 'isProjected' in bill && bill.isProjected;
              const cssVar = urgencyVarMap[urgency];
              const mutationState = getMutationState?.(bill.id);
              const isLoading = mutationState === 'marking_paid';
              const { icon: BillIcon, colorClass } = getBillIcon(bill);

              return (
                <div
                  key={bill.id}
                  className={cn(
                    'group relative rounded-xl overflow-hidden',
                    'bg-white/[0.02]',
                    'border border-white/[0.06]',
                    'hover:bg-white/[0.04] hover:border-white/[0.12]',
                    'transition-all duration-300',
                    isProjected && 'border-dashed border-white/[0.08]',
                    bill.is_paid && 'opacity-50',
                    'animate-in fade-in slide-in-from-bottom-3 duration-500'
                  )}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Urgency accent - top border glow */}
                  <div
                    className={cn(
                      'absolute top-0 left-0 right-0 h-[2px]',
                      isProjected && 'opacity-40',
                      bill.is_paid && 'opacity-20'
                    )}
                    style={{
                      background: bill.is_paid
                        ? 'linear-gradient(90deg, transparent, #10b981, transparent)'
                        : `linear-gradient(90deg, transparent, var(${cssVar}), transparent)`,
                    }}
                  />

                  {/* Main content - clickable for bill details */}
                  <button
                    onClick={() => onBillClick(bill)}
                    className="w-full flex items-center gap-4 p-4 text-left"
                  >
                    {/* Icon container */}
                    <div
                      className={cn(
                        'relative w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0',
                        'bg-gradient-to-br from-white/[0.06] to-white/[0.02]',
                        'border border-white/[0.08]',
                        'group-hover:scale-105 group-hover:border-white/[0.15]',
                        'transition-all duration-300',
                        isProjected && 'opacity-60'
                      )}
                    >
                      <BillIcon className={cn("w-7 h-7 relative z-10", colorClass)} />
                      {/* Projected indicator */}
                      {isProjected && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 border-2 border-[#09090d] flex items-center justify-center">
                          <RefreshCw className="w-2.5 h-2.5 text-zinc-400" />
                        </div>
                      )}
                      {/* Paid checkmark */}
                      {bill.is_paid && (
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#09090d] flex items-center justify-center shadow-lg shadow-emerald-500/30">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Bill info */}
                    <div className="flex-1 min-w-0">
                      {/* Name and badges row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4
                          className={cn(
                            'font-semibold text-white truncate text-[15px]',
                            isProjected && 'text-zinc-300',
                            bill.is_paid && 'line-through text-zinc-500'
                          )}
                        >
                          {bill.name}
                        </h4>
                      </div>

                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {bill.is_paid && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-medium">
                            <Check className="w-2.5 h-2.5" />
                            Paid
                          </span>
                        )}
                        {isProjected && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-400 font-medium">
                            Projected
                          </span>
                        )}
                        {bill.is_autopay && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                            <CreditCard className="w-2.5 h-2.5" />
                            Autopay
                          </span>
                        )}
                        {!bill.is_autopay && !isProjected && !bill.is_paid && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
                            Manual
                          </span>
                        )}
                        {bill.is_recurring && !isProjected && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 capitalize">
                            <RefreshCw className="w-2.5 h-2.5" />
                            {bill.recurrence_interval}
                          </span>
                        )}
                      </div>

                      {/* Amount and urgency */}
                      <div className="flex items-center gap-3">
                        {bill.amount !== null && bill.amount !== undefined && (
                          <span className={cn(
                            'text-lg font-bold tracking-tight',
                            bill.is_paid ? 'text-zinc-500' : 'text-white'
                          )}>
                            {formatCurrency(bill.amount)}
                          </span>
                        )}
                        {!bill.is_paid && !isProjected && (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-md"
                            style={{
                              backgroundColor: `color-mix(in srgb, var(${cssVar}) 15%, transparent)`,
                              color: `var(${cssVar})`
                            }}
                          >
                            {getUrgencyLabel(daysLeft)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 flex-shrink-0" />
                  </button>

                  {/* Action buttons - only show for non-projected, non-paid bills */}
                  {!isProjected && !bill.is_paid && (
                    <div className="flex items-center gap-3 px-4 pb-4 pt-0">
                      {/* Pay Now button - only if payment_url exists */}
                      {bill.payment_url && (
                        <a
                          href={bill.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-400/50 transition-all duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Pay Now
                        </a>
                      )}

                      {/* Mark Paid button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkPaid?.(bill as Bill);
                        }}
                        disabled={isLoading}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200',
                          'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
                          'hover:bg-emerald-500/30 hover:border-emerald-400/50',
                          isLoading && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Mark Paid
                      </button>

                      {/* Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit?.(bill as Bill);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg bg-white/[0.05] text-zinc-400 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15] transition-all duration-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add bill button */}
        <div className="p-4 pb-24 lg:pb-4 border-t border-white/[0.06]">
          <button
            onClick={() => onAddBill(date)}
            className="group relative w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl overflow-hidden transition-all duration-300"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </div>

            {/* Glow effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            />

            {/* Content */}
            <Plus className="w-5 h-5 text-white relative z-10 group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-white font-semibold relative z-10">Add Bill for This Day</span>
          </button>
        </div>
      </div>
    </div>
  );
}
