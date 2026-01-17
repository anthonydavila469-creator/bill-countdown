'use client';

import { Bill } from '@/types';
import { cn, formatCurrency, formatDate, getDaysUntilDue, getUrgency } from '@/lib/utils';
import { getBillRiskType, hasLatePaymentRisk, RiskType } from '@/lib/risk-utils';
import {
  Check,
  Zap,
  ExternalLink,
  CreditCard,
  RefreshCw,
  Calendar,
  Minus,
  AlertTriangle,
  Clock,
  History,
  AlertCircle,
} from 'lucide-react';

interface BillListViewProps {
  bills: Bill[];
  allBills?: Bill[]; // For calculating "forgot last month" risk
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onBillClick: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => void;
  onPayNow: (bill: Bill) => void;
}

// Risk badge styling
const riskBadgeStyles: Record<RiskType, { bg: string; border: string; text: string; label: string }> = {
  overdue: {
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/25',
    text: 'text-rose-400',
    label: 'Overdue',
  },
  urgent: {
    bg: 'bg-orange-500/15',
    border: 'border-orange-500/25',
    text: 'text-orange-400',
    label: 'Urgent',
  },
  forgot_last_month: {
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/25',
    text: 'text-violet-400',
    label: 'Forgot',
  },
};

const riskIcons: Record<RiskType, typeof AlertTriangle> = {
  overdue: AlertTriangle,
  urgent: Clock,
  forgot_last_month: History,
};

// Urgency color mapping
const urgencyStyles: Record<string, { bg: string; text: string; glow: string }> = {
  overdue: {
    bg: 'bg-rose-500',
    text: 'text-rose-400',
    glow: 'shadow-[0_0_8px_rgba(244,63,94,0.5)]',
  },
  urgent: {
    bg: 'bg-orange-500',
    text: 'text-orange-400',
    glow: 'shadow-[0_0_8px_rgba(251,146,60,0.5)]',
  },
  soon: {
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  },
  safe: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(52,211,153,0.5)]',
  },
  distant: {
    bg: 'bg-cyan-500',
    text: 'text-cyan-400',
    glow: 'shadow-[0_0_8px_rgba(34,211,238,0.5)]',
  },
};

export function BillListView({
  bills,
  allBills,
  selectedIds,
  onSelectionChange,
  onBillClick,
  onMarkPaid,
  onPayNow,
}: BillListViewProps) {
  const unpaidBills = bills.filter((b) => !b.is_paid);
  const billsForRiskCalc = allBills || bills;
  const allSelected = unpaidBills.length > 0 && unpaidBills.every((b) => selectedIds.has(b.id));
  const someSelected = unpaidBills.some((b) => selectedIds.has(b.id));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(unpaidBills.map((b) => b.id)));
    }
  };

  const handleSelectBill = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedIds);
    if (newSelection.has(billId)) {
      newSelection.delete(billId);
    } else {
      newSelection.add(billId);
    }
    onSelectionChange(newSelection);
  };

  const handleMarkPaid = (bill: Bill, e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkPaid(bill);
  };

  const handlePayNow = (bill: Bill, e: React.MouseEvent) => {
    e.stopPropagation();
    onPayNow(bill);
  };

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-lg font-medium text-zinc-400 mb-1">No bills found</h3>
        <p className="text-sm text-zinc-500 text-center">
          Try adjusting your filters or add a new bill.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
      {/* Table Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-white/[0.03] via-white/[0.02] to-white/[0.03] border-b border-white/[0.06]">
        {/* Select all checkbox */}
        <div className="w-5 flex-shrink-0">
          <button
            onClick={handleSelectAll}
            className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
              allSelected
                ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                : someSelected
                ? 'bg-cyan-500/30 border-cyan-500'
                : 'border-zinc-600 hover:border-zinc-500'
            )}
          >
            {allSelected && <Check className="w-3 h-3 text-white" />}
            {someSelected && !allSelected && <Minus className="w-3 h-3 text-white" />}
          </button>
        </div>

        {/* Column headers */}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Bill</span>
        </div>
        <div className="hidden sm:block w-28 text-right">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Due</span>
        </div>
        <div className="hidden sm:block w-20 text-right">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Days</span>
        </div>
        <div className="hidden sm:block w-24 text-right">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Amount</span>
        </div>
        <div className="w-24 text-right flex-shrink-0">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Actions</span>
        </div>
      </div>

      {/* Bill rows */}
      <div className="divide-y divide-white/[0.04]">
        {bills.map((bill, index) => {
          const isSelected = selectedIds.has(bill.id);
          const daysLeft = getDaysUntilDue(bill.due_date);
          const urgency = getUrgency(daysLeft);
          const isPaid = bill.is_paid;
          const hasPaymentLink = !!bill.payment_url;
          const styles = urgencyStyles[urgency];
          const riskType = getBillRiskType(bill, billsForRiskCalc);
          const showLatePaymentRisk = hasLatePaymentRisk(bill);
          const riskStyle = riskType ? riskBadgeStyles[riskType] : null;
          const RiskIcon = riskType ? riskIcons[riskType] : null;

          return (
            <div
              key={bill.id}
              onClick={() => onBillClick(bill)}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200',
                isSelected
                  ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                  : 'hover:bg-white/[0.03]',
                isPaid && 'opacity-50'
              )}
              style={{
                animationDelay: `${index * 30}ms`,
              }}
            >
              {/* Checkbox */}
              <div className="w-5 flex-shrink-0">
                {!isPaid ? (
                  <button
                    onClick={(e) => handleSelectBill(bill.id, e)}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                      isSelected
                        ? 'bg-cyan-500 border-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                        : 'border-zinc-600 hover:border-zinc-500'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                ) : (
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                )}
              </div>

              {/* Bill info */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                {/* Urgency bar */}
                <div
                  className={cn(
                    'w-1 h-10 rounded-full flex-shrink-0 transition-all duration-300',
                    styles.bg,
                    !isPaid && styles.glow
                  )}
                />

                {/* Emoji */}
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <span className="text-xl">{bill.emoji}</span>
                </div>

                {/* Name + badges */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white truncate text-sm">{bill.name}</h3>

                    {/* Risk badge - highest priority */}
                    {riskStyle && RiskIcon && !isPaid && (
                      <span className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md border",
                        riskStyle.bg, riskStyle.border
                      )}>
                        <RiskIcon className={cn("w-3 h-3", riskStyle.text)} />
                        <span className={cn("text-[10px] font-semibold", riskStyle.text)}>
                          {riskStyle.label}
                        </span>
                      </span>
                    )}

                    {/* Badges - inline */}
                    {bill.is_autopay && !isPaid && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25">
                        <CreditCard className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-semibold text-emerald-400">Auto</span>
                      </span>
                    )}

                    {bill.is_recurring && !isPaid && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/25">
                        <RefreshCw className="w-3 h-3 text-violet-400" />
                        <span className="text-[10px] font-semibold text-violet-400 hidden lg:inline">
                          {bill.recurrence_interval}
                        </span>
                      </span>
                    )}

                    {isPaid && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-semibold text-emerald-400">Paid</span>
                      </span>
                    )}
                  </div>

                  {/* Mobile: show due date + amount inline */}
                  <p className="text-xs text-zinc-500 sm:hidden mt-0.5">
                    {formatDate(bill.due_date)}
                    {bill.amount && ` • ${formatCurrency(bill.amount)}`}
                    {showLatePaymentRisk && (
                      <span className="text-rose-400 ml-1.5 inline-flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Late risk
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Due date */}
              <div className="hidden sm:flex w-28 items-center justify-end gap-2">
                <span className="text-sm text-zinc-400 font-medium">{formatDate(bill.due_date)}</span>
                {showLatePaymentRisk && (
                  <span className="text-rose-400" title="Late fee risk">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              {/* Countdown */}
              <div className="hidden sm:flex w-20 items-center justify-end">
                <span className={cn(
                  'text-sm font-bold tabular-nums',
                  isPaid ? 'text-emerald-400' : styles.text
                )}>
                  {isPaid ? (
                    'Paid'
                  ) : daysLeft < 0 ? (
                    `${Math.abs(daysLeft)}d ago`
                  ) : daysLeft === 0 ? (
                    'Today'
                  ) : (
                    `${daysLeft}d`
                  )}
                </span>
              </div>

              {/* Amount */}
              <div className="hidden sm:flex w-24 items-center justify-end">
                {bill.amount ? (
                  <span className="text-sm font-semibold text-white tabular-nums">
                    {formatCurrency(bill.amount)}
                  </span>
                ) : (
                  <span className="text-sm text-zinc-600">—</span>
                )}
              </div>

              {/* Actions */}
              <div className="w-24 flex items-center justify-end gap-1.5 flex-shrink-0">
                {!isPaid && (
                  <>
                    {/* Pay Now button */}
                    {hasPaymentLink ? (
                      <button
                        onClick={(e) => handlePayNow(bill, e)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                          'bg-gradient-to-r from-blue-500 to-violet-500 text-white',
                          'hover:from-blue-400 hover:to-violet-400',
                          'active:scale-95',
                          'shadow-lg shadow-blue-500/25'
                        )}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden lg:inline">Pay</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] text-zinc-600 cursor-not-allowed"
                        title="Add payment link in Edit Bill"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden lg:inline">Pay</span>
                      </button>
                    )}

                    {/* Mark Paid button */}
                    <button
                      onClick={(e) => handleMarkPaid(bill, e)}
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                        'bg-white/[0.03] hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400',
                        'border border-white/[0.06] hover:border-emerald-500/30',
                        'active:scale-95'
                      )}
                      title={bill.is_autopay ? 'Confirm Auto-Paid' : 'Mark as Paid'}
                    >
                      {bill.is_autopay ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}

                {isPaid && (
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">Done</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
