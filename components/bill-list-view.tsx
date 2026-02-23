'use client';

import { Bill } from '@/types';
import { cn, formatCurrency, formatDate, formatDateCompact, getDaysUntilDue, getUrgency } from '@/lib/utils';
import { getBillRiskType, hasLatePaymentRisk, RiskType } from '@/lib/risk-utils';
import { getBillIcon } from '@/lib/get-bill-icon';
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
  Crown,
} from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';

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
    bg: 'bg-violet-500/15',
    border: 'border-violet-500/25',
    text: 'text-violet-400',
    label: 'Urgent',
  },
  forgot_last_month: {
    bg: 'bg-violet-400/15',
    border: 'border-violet-400/25',
    text: 'text-violet-300',
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
    bg: 'bg-violet-500',
    text: 'text-violet-400',
    glow: 'shadow-[0_0_8px_rgba(251,146,60,0.5)]',
  },
  soon: {
    bg: 'bg-violet-400',
    text: 'text-violet-300',
    glow: 'shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  },
  safe: {
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_8px_rgba(52,211,153,0.5)]',
  },
  distant: {
    bg: 'bg-violet-500',
    text: 'text-violet-400',
    glow: 'shadow-[0_0_8px_rgba(249,115,22,0.5)]',
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
  const { canUsePaymentLinks, showUpgradeModal } = useSubscription();
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
    <div className="w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-white/[0.01] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
      {/* Table Header - Enhanced with gradient and better styling */}
      <div className="relative flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-white/[0.04] via-white/[0.03] to-white/[0.04] border-b border-white/[0.08]">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Select all checkbox */}
        <div className="w-6 flex-shrink-0">
          <button
            onClick={handleSelectAll}
            className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
              allSelected
                ? 'bg-violet-500 border-violet-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                : someSelected
                ? 'bg-violet-500/30 border-violet-500'
                : 'border-zinc-600 hover:border-zinc-400'
            )}
          >
            {allSelected && <Check className="w-3 h-3 text-white" />}
            {someSelected && !allSelected && <Minus className="w-3 h-3 text-white" />}
          </button>
        </div>

        {/* Column headers - Enhanced styling */}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Bill</span>
        </div>
        <div className="hidden sm:block w-28 text-right">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Due</span>
        </div>
        <div className="hidden sm:block w-24 text-right">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Days</span>
        </div>
        <div className="hidden sm:block w-24 text-right">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Amount</span>
        </div>
        <div className="w-28 text-right flex-shrink-0">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Actions</span>
        </div>
      </div>

      {/* Bill rows */}
      <div className="divide-y divide-white/[0.05]">
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
          const isEven = index % 2 === 0;

          const { icon: BillIcon, colorClass } = getBillIcon(bill);

          return (
            <div
              key={bill.id}
              onClick={() => onBillClick(bill)}
              className={cn(
                'group relative flex items-center gap-3 px-5 py-5 cursor-pointer transition-all duration-200',
                isSelected
                  ? 'bg-violet-500/10 hover:bg-violet-500/15'
                  : isEven
                    ? 'bg-white/[0.015] hover:bg-white/[0.04]'
                    : 'hover:bg-white/[0.04]',
                isPaid && 'opacity-50',
                'animate-in fade-in slide-in-from-left-1'
              )}
              style={{
                animationDelay: `${index * 30}ms`,
                animationFillMode: 'backwards'
              }}
            >
              {/* Hover accent line */}
              <div className={cn(
                'absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-200 opacity-0 group-hover:opacity-100',
                styles.bg
              )} />

              {/* Checkbox */}
              <div className="w-6 flex-shrink-0">
                {!isPaid ? (
                  <button
                    onClick={(e) => handleSelectBill(bill.id, e)}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                      isSelected
                        ? 'bg-violet-500 border-violet-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                        : 'border-zinc-600 hover:border-zinc-400 hover:bg-white/[0.03]'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                ) : (
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                    <Check className="w-3 h-3 text-emerald-400" />
                  </div>
                )}
              </div>

              {/* Bill info */}
              <div className="flex-1 min-w-0 flex items-center gap-3">
                {/* Urgency bar - wider with glow */}
                <div
                  className={cn(
                    'w-1.5 h-12 rounded-full flex-shrink-0 transition-all duration-300',
                    styles.bg,
                    !isPaid && styles.glow
                  )}
                />

                {/* Icon container - larger */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:border-white/[0.12] transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <BillIcon className={cn("w-6 h-6", colorClass)} />
                </div>

                {/* Name + badges */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white truncate text-sm group-hover:text-white/90 transition-colors">{bill.name}</h3>

                    {/* Risk badge - highest priority with enhanced styling */}
                    {riskStyle && RiskIcon && !isPaid && (
                      <span className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-lg border shadow-sm",
                        riskStyle.bg, riskStyle.border
                      )}>
                        <RiskIcon className={cn("w-3 h-3", riskStyle.text)} />
                        <span className={cn("text-[10px] font-bold", riskStyle.text)}>
                          {riskStyle.label}
                        </span>
                      </span>
                    )}

                    {/* Badges - inline with enhanced styling */}
                    {bill.is_autopay && !isPaid && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 shadow-sm">
                        <CreditCard className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400">Auto</span>
                      </span>
                    )}

                    {bill.is_recurring && !isPaid && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-400/15 border border-violet-400/25 shadow-sm">
                        <RefreshCw className="w-3 h-3 text-violet-300" />
                        <span className="text-[10px] font-bold text-violet-300 hidden lg:inline">
                          {bill.recurrence_interval}
                        </span>
                      </span>
                    )}

                    {isPaid && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 shadow-sm">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400">Paid</span>
                      </span>
                    )}
                  </div>

                  {/* Mobile: show due date + amount inline */}
                  <p className="text-xs text-zinc-500 sm:hidden mt-1">
                    {formatDateCompact(bill.due_date)}
                    {bill.amount && ` • ${formatCurrency(bill.amount)}`}
                  </p>
                </div>
              </div>

              {/* Due date */}
              <div className="hidden sm:flex w-28 items-center justify-end gap-2">
                <span className="text-sm text-zinc-300 font-medium">{formatDate(bill.due_date)}</span>
                {showLatePaymentRisk && (
                  <span className="text-rose-400" title="Late fee risk">
                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                  </span>
                )}
              </div>

              {/* Countdown - enhanced with pill styling */}
              <div className="hidden sm:flex w-24 items-center justify-end">
                <span className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums border',
                  isPaid
                    ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20'
                    : urgency === 'overdue'
                      ? 'text-rose-300 bg-rose-500/15 border-rose-500/20'
                      : urgency === 'urgent'
                        ? 'text-violet-300 bg-violet-500/15 border-violet-500/20'
                        : urgency === 'soon'
                          ? 'text-violet-200 bg-violet-400/15 border-violet-400/20'
                          : 'text-zinc-300 bg-white/[0.05] border-white/[0.08]'
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

              {/* Amount - enhanced */}
              <div className="hidden sm:flex w-24 items-center justify-end">
                {bill.amount ? (
                  <span className="text-sm font-bold text-white tabular-nums">
                    {formatCurrency(bill.amount)}
                  </span>
                ) : (
                  <span className="text-sm text-zinc-600">—</span>
                )}
              </div>

              {/* Actions - enhanced buttons */}
              <div className="w-28 flex items-center justify-end gap-2 flex-shrink-0">
                {!isPaid && (
                  <>
                    {/* Pay Now button - enhanced gradient */}
                    {hasPaymentLink && canUsePaymentLinks ? (
                      <button
                        onClick={(e) => handlePayNow(bill, e)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all duration-200',
                          'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
                          'hover:from-emerald-400 hover:to-teal-400',
                          'active:scale-95',
                          'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
                        )}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Pay</span>
                      </button>
                    ) : hasPaymentLink && !canUsePaymentLinks ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showUpgradeModal('payment links');
                        }}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all duration-200',
                          'bg-gradient-to-r from-violet-400/20 to-violet-500/20 text-violet-200',
                          'hover:from-violet-400/30 hover:to-violet-500/30',
                          'active:scale-95',
                          'border border-violet-400/30'
                        )}
                        title="Upgrade to Pro for payment links"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Pro</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium bg-white/[0.04] text-zinc-500 cursor-not-allowed border border-white/[0.06] border-dashed"
                        title="Add payment link in Edit Bill"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Pay</span>
                      </button>
                    )}

                    {/* Mark Paid button - enhanced */}
                    <button
                      onClick={(e) => handleMarkPaid(bill, e)}
                      className={cn(
                        'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
                        'bg-gradient-to-b from-white/[0.04] to-white/[0.02] hover:from-emerald-500/20 hover:to-emerald-500/10',
                        'text-zinc-500 hover:text-emerald-400',
                        'border border-white/[0.08] hover:border-emerald-500/30',
                        'active:scale-95',
                        'shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
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
                  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400">Done</span>
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
