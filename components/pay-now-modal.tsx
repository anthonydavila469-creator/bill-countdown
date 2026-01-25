'use client';

import { useState, useEffect } from 'react';
import { Bill } from '@/types';
import { cn, formatCurrency, getDaysUntilDue, getUrgency } from '@/lib/utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import {
  X,
  Check,
  Clock,
  DollarSign,
  CreditCard,
  Sparkles,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

interface PayNowModalProps {
  bill: Bill;
  isOpen: boolean;
  onClose: () => void;
  onMarkPaid: (bill: Bill, amount: number | null) => Promise<void>;
}

// Urgency-based gradient backgrounds matching the app's aesthetic
const urgencyGradients = {
  overdue: 'from-rose-600/90 via-red-500/80 to-orange-500/70',
  urgent: 'from-orange-500/90 via-amber-500/80 to-yellow-500/70',
  soon: 'from-amber-500/90 via-yellow-500/80 to-lime-500/70',
  safe: 'from-emerald-500/90 via-teal-500/80 to-cyan-500/70',
  distant: 'from-cyan-500/90 via-blue-500/80 to-indigo-500/70',
};

export function PayNowModal({ bill, isOpen, onClose, onMarkPaid }: PayNowModalProps) {
  // For variable bills, prefer last_paid_amount as the default (what they paid last time)
  // For regular bills, use the fixed amount
  const getDefaultAmount = () => {
    if (bill.is_variable && bill.last_paid_amount !== null && bill.last_paid_amount !== undefined) {
      return bill.last_paid_amount.toString();
    }
    return bill.amount?.toString() || '';
  };

  const [paidAmount, setPaidAmount] = useState<string>(getDefaultAmount());
  const [isMarking, setIsMarking] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
      if (e.key === 'Escape' && !isMarking) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isMarking, onClose]);

  if (!isOpen) return null;

  const handleMarkPaid = async () => {
    setIsMarking(true);
    try {
      const amount = paidAmount ? parseFloat(paidAmount) : null;
      await onMarkPaid(bill, amount);
      onClose();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    } finally {
      setIsMarking(false);
    }
  };

  const handleNotYet = () => {
    onClose();
  };

  const isAutopay = bill.is_autopay;
  const daysLeft = getDaysUntilDue(bill.due_date);
  const urgency = getUrgency(daysLeft);
  const gradientClass = urgencyGradients[urgency];

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
        onClick={() => !isMarking && onClose()}
      />

      {/* Modal container */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={cn(
              'relative w-full max-w-md overflow-hidden',
              'animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300'
            )}
          >
            {/* Outer glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-b from-white/10 to-transparent rounded-3xl blur-xl opacity-50" />

            {/* Main modal */}
            <div className="relative bg-[#0a0a0e] border border-white/[0.08] rounded-2xl shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden">
              {/* Gradient header section */}
              <div className={cn('relative bg-gradient-to-br', gradientClass)}>
                {/* Noise texture overlay */}
                <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==')]" />

                {/* Gradient mesh overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10" />

                {/* Close button */}
                <button
                  onClick={onClose}
                  disabled={isMarking}
                  className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header content */}
                <div className="relative p-6 pb-8">
                  <div className="flex items-center gap-4">
                    {/* Icon with glass container */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl" />
                      <div className="relative w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                        {(() => {
                          const { icon: BillIcon, colorClass } = getBillIcon(bill);
                          return <BillIcon className={cn("w-8 h-8", colorClass)} />;
                        })()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold text-white truncate drop-shadow-lg">
                          {bill.name}
                        </h2>
                        {bill.is_variable && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/30 backdrop-blur-sm">
                            <TrendingUp className="w-3 h-3 text-amber-200" />
                            <span className="text-xs font-medium text-amber-100">Variable</span>
                          </div>
                        )}
                      </div>
                      {bill.is_variable && bill.typical_min !== null && bill.typical_max !== null ? (
                        <p className="text-white/90 text-lg font-semibold flex items-center gap-1 drop-shadow">
                          ${bill.typical_min.toFixed(2)} - ${bill.typical_max.toFixed(2)}
                        </p>
                      ) : bill.amount ? (
                        <p className="text-white/90 text-lg font-semibold flex items-center gap-1 drop-shadow">
                          ${bill.amount.toFixed(2)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body content */}
              <div className="p-6 space-y-6">
                {/* Confirmation question with animated icon */}
                <div className="text-center">
                  {/* Animated success icon */}
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    {/* Outer glow rings */}
                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-2 rounded-full bg-emerald-500/15 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />

                    {/* Main circle */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-500/20 border border-emerald-500/40 backdrop-blur-sm" />

                    {/* Inner glow */}
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-emerald-500/40 to-teal-600/30 shadow-[inset_0_0_20px_rgba(16,185,129,0.4)]" />

                    {/* Check icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-2">
                    Did you complete the payment?
                  </h3>
                  <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                    {bill.payment_url
                      ? 'The payment site should have opened in a new tab.'
                      : 'Confirm if you have paid this bill.'}
                  </p>
                </div>

                {/* Amount editor with premium styling */}
                <div className="relative">
                  {/* Subtle glow behind input section */}
                  <div className={cn(
                    "absolute inset-0 rounded-2xl transition-opacity duration-300",
                    isFocused ? "opacity-100" : "opacity-0"
                  )} style={{
                    background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.1) 0%, transparent 70%)'
                  }} />

                  <div className={cn(
                    "relative p-5 rounded-2xl border transition-all duration-300",
                    isFocused
                      ? "bg-emerald-500/[0.03] border-emerald-500/30 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]"
                      : "bg-white/[0.02] border-white/[0.08]"
                  )}>
                    <label className="block text-sm font-medium text-zinc-400 mb-3">
                      Amount Paid
                    </label>

                    <div className="relative">
                      {/* Currency indicator */}
                      <div className={cn(
                        "absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                        isFocused ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-zinc-500"
                      )}>
                        <DollarSign className="w-5 h-5" />
                      </div>

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="0.00"
                        className={cn(
                          "w-full pl-14 pr-4 py-4 rounded-xl text-xl font-semibold transition-all duration-300",
                          "bg-black/30 border placeholder-zinc-600 text-white",
                          "focus:outline-none",
                          isFocused
                            ? "border-emerald-500/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
                            : "border-white/10"
                        )}
                      />
                    </div>

                    {bill.is_variable ? (
                      <div className="mt-3 space-y-1">
                        {bill.typical_min !== null && bill.typical_max !== null && (
                          <p className="text-xs text-amber-400/80 flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3" />
                            Typical range: ${bill.typical_min.toFixed(2)} - ${bill.typical_max.toFixed(2)}
                          </p>
                        )}
                        {bill.last_paid_amount !== null && bill.last_paid_amount !== undefined && (
                          <p className="text-xs text-zinc-400">
                            Last paid: ${bill.last_paid_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-zinc-500">
                        Edit if the amount differs from the original
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment method indicator with premium badge */}
                <div className="flex justify-center">
                  {isAutopay ? (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-lg group-hover:bg-cyan-500/30 transition-colors" />
                      <div className="relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 shadow-lg">
                        <CreditCard className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-300">
                          Will be recorded as Autopay
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-lg group-hover:bg-amber-500/30 transition-colors" />
                      <div className="relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 shadow-lg">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-amber-300">
                          Will be recorded as Manual
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons with premium styling */}
                <div className="flex gap-3 pt-2">
                  {/* Not Yet button */}
                  <button
                    onClick={handleNotYet}
                    disabled={isMarking}
                    className={cn(
                      "flex-1 group relative overflow-hidden",
                      "flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-medium",
                      "bg-white/[0.03] border border-white/10",
                      "text-zinc-300 hover:text-white",
                      "transition-all duration-300",
                      "hover:bg-white/[0.06] hover:border-white/20",
                      "active:scale-[0.98]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Clock className="w-5 h-5" />
                    <span>Not Yet</span>
                  </button>

                  {/* Mark Paid button */}
                  <button
                    onClick={handleMarkPaid}
                    disabled={isMarking}
                    className={cn(
                      "flex-1 group relative overflow-hidden",
                      "flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-semibold",
                      "text-white",
                      "transition-all duration-300",
                      "active:scale-[0.98]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />

                    {/* Shine effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </div>

                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-xl shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] group-hover:shadow-[0_0_40px_-5px_rgba(16,185,129,0.6)] transition-shadow duration-300" />

                    {/* Content */}
                    <div className="relative flex items-center justify-center gap-2">
                      {isMarking ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Mark Paid</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
