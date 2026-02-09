'use client';

import { useState, useEffect } from 'react';
import { X, Check, Pencil, Trash2, Calendar, DollarSign, RefreshCw, FileText, ExternalLink, Link, CreditCard, TrendingUp, TrendingDown, AlertTriangle, Crown } from 'lucide-react';
import { Bill } from '@/types';
import { cn, formatDate, formatCurrency, getDaysUntilDue, getUrgency, formatCountdown, getPriceChange } from '@/lib/utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import { GradientCard } from './ui/gradient-card';
import { CountdownDisplay } from './countdown-display';
import { useSubscription } from '@/hooks/use-subscription';
import { useTheme } from '@/contexts/theme-context';

interface BillDetailModalProps {
  isOpen: boolean;
  bill: Bill | null;
  onClose: () => void;
  onEdit: (bill: Bill) => void;
  onDelete: (bill: Bill) => void;
  onMarkPaid: (bill: Bill) => Promise<void>;
}

export function BillDetailModal({
  isOpen,
  bill,
  onClose,
  onEdit,
  onDelete,
  onMarkPaid,
}: BillDetailModalProps) {
  const { canUsePaymentLinks, showUpgradeModal } = useSubscription();
  const { selectedTheme } = useTheme();
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isMarkingPaid) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isMarkingPaid, onClose]);

  const handleMarkPaid = async () => {
    if (!bill) return;
    setIsMarkingPaid(true);
    await onMarkPaid(bill);
    setIsMarkingPaid(false);
  };

  if (!isOpen || !bill) return null;

  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgency = getUrgency(daysLeft);
  const priceChange = getPriceChange(bill.amount, bill.previous_amount);
  const { icon: BillIcon, colorClass } = getBillIcon(bill);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !isMarkingPaid && onClose()}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={cn(
              'relative w-full max-w-md bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl overflow-hidden',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            {/* Header with gradient */}
            <GradientCard urgency={urgency} className="rounded-none rounded-t-2xl">
              <div className="p-6 pb-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <BillIcon className={cn("w-8 h-8", colorClass)} />
                  </div>
                  <button
                    onClick={onClose}
                    disabled={isMarkingPaid}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-2xl font-bold text-white mb-1">{bill.name}</h2>
                {bill.amount && (
                  <p className="text-white/80 text-lg font-medium">
                    {formatCurrency(bill.amount)}
                  </p>
                )}

                <div className="mt-6 flex justify-center">
                  <CountdownDisplay
                    daysLeft={daysLeft}
                    urgency={urgency}
                    size="lg"
                    colorMode={
                      ['midnight', 'wine', 'onyx', 'amethyst', 'ocean', 'sunset'].includes(selectedTheme)
                        ? 'gradient'
                        : (urgency === 'overdue' || urgency === 'urgent' || urgency === 'soon')
                          ? 'urgency'
                          : 'white'
                    }
                  />
                </div>
              </div>
            </GradientCard>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Due date */}
              <div className="flex items-center gap-3 text-zinc-300">
                <Calendar className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-500">Due Date</p>
                  <p className="font-medium">{formatDate(bill.due_date)}</p>
                </div>
              </div>

              {/* Recurring */}
              {bill.is_recurring && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <RefreshCw className="w-5 h-5 text-zinc-500" />
                  <div>
                    <p className="text-sm text-zinc-500">Repeats</p>
                    <p className="font-medium capitalize">{bill.recurrence_interval}</p>
                  </div>
                </div>
              )}

              {/* Autopay Status */}
              <div className="flex items-center gap-3 text-zinc-300">
                <CreditCard className={cn(
                  "w-5 h-5",
                  bill.is_autopay ? "text-emerald-500" : "text-zinc-500"
                )} />
                <div>
                  <p className="text-sm text-zinc-500">Payment Method</p>
                  <p className={cn(
                    "font-medium",
                    bill.is_autopay ? "text-emerald-400" : "text-amber-400"
                  )}>
                    {bill.is_autopay ? "Autopay Enabled" : "Manual Payment Required"}
                  </p>
                </div>
              </div>

              {/* Price Change Alert */}
              {priceChange && (
                <div className={cn(
                  "flex items-start gap-3 p-3 rounded-xl",
                  priceChange.isIncrease
                    ? "bg-rose-500/10 border border-rose-500/20"
                    : "bg-emerald-500/10 border border-emerald-500/20"
                )}>
                  {priceChange.isIncrease ? (
                    <TrendingUp className="w-5 h-5 text-rose-400 mt-0.5" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-emerald-400 mt-0.5" />
                  )}
                  <div>
                    <p className={cn(
                      "font-medium",
                      priceChange.isIncrease ? "text-rose-400" : "text-emerald-400"
                    )}>
                      Price {priceChange.isIncrease ? "Increased" : "Decreased"}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {priceChange.isIncrease ? "Up" : "Down"} {formatCurrency(priceChange.amount)} ({priceChange.percentage.toFixed(1)}%) from {formatCurrency(bill.previous_amount!)}
                    </p>
                  </div>
                </div>
              )}

              {/* Category */}
              {bill.category && (
                <div className="flex items-center gap-3 text-zinc-300">
                  <DollarSign className="w-5 h-5 text-zinc-500" />
                  <div>
                    <p className="text-sm text-zinc-500">Category</p>
                    <p className="font-medium capitalize">{bill.category.replace('_', ' ')}</p>
                  </div>
                </div>
              )}

              {/* Payment Link */}
              {bill.payment_url && (
                <div className="flex items-start gap-3 text-zinc-300">
                  <Link className="w-5 h-5 text-zinc-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-500">Payment Link</p>
                    <p className="font-medium text-orange-400 truncate">{bill.payment_url}</p>
                  </div>
                </div>
              )}

              {/* Source */}
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-zinc-500">
                  Added {bill.source === 'gmail' ? 'from email' : 'manually'} •{' '}
                  {new Date(bill.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 space-y-3">
              {/* Pay Now button - only show if payment URL exists */}
              {bill.payment_url && canUsePaymentLinks && (
                <a
                  href={bill.payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <ExternalLink className="w-5 h-5" />
                  Pay Now
                </a>
              )}

              {/* Upgrade prompt for Pay Now - free users with payment URL */}
              {bill.payment_url && !canUsePaymentLinks && (
                <button
                  onClick={() => showUpgradeModal('payment links')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-200 font-semibold rounded-xl hover:from-amber-500/30 hover:to-orange-500/30 transition-colors"
                >
                  <Crown className="w-5 h-5" />
                  Upgrade for Pay Now
                </button>
              )}

              {/* Mark as Paid button */}
              <button
                onClick={handleMarkPaid}
                disabled={isMarkingPaid}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMarkingPaid ? (
                  'Marking as Paid...'
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Mark as Paid
                  </>
                )}
              </button>

              {/* Edit and Delete buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onEdit(bill);
                  }}
                  disabled={isMarkingPaid}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onDelete(bill);
                  }}
                  disabled={isMarkingPaid}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-red-400 font-medium rounded-xl hover:bg-red-500/10 hover:border-red-500/20 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
