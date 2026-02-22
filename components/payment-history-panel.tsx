'use client';

import { useState, useEffect } from 'react';
import { History, Check, CreditCard, Calendar } from 'lucide-react';
import { PaymentHistoryEntry } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

interface PaymentHistoryPanelProps {
  billId: string;
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function formatPaymentDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-white/[0.06]" />
            <div className="h-3 w-32 rounded bg-white/[0.04]" />
          </div>
          <div className="h-4 w-16 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export function PaymentHistoryPanel({ billId }: PaymentHistoryPanelProps) {
  const [entries, setEntries] = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/payment-history?bill_id=${billId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        if (!cancelled) setEntries(data);
      } catch (err) {
        console.error('Error fetching payment history:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => { cancelled = true; };
  }, [billId]);

  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] backdrop-blur-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <History className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase">
          Payment History
        </h3>
        {!loading && entries.length > 0 && (
          <span className="ml-auto text-xs text-zinc-500 tabular-nums">
            {entries.length} payment{entries.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-500">No payments recorded yet</p>
        </div>
      )}

      {/* Timeline */}
      {!loading && entries.length > 0 && (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-transparent" />

          <div className="space-y-0">
            {entries.map((entry, index) => {
              const isAutopay = entry.paid_method === 'autopay';

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'relative flex items-start gap-3 py-3',
                    'animate-in fade-in slide-in-from-left-1',
                  )}
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      isAutopay
                        ? 'bg-blue-500/15 ring-1 ring-blue-500/25'
                        : 'bg-emerald-500/15 ring-1 ring-emerald-500/25'
                    )}
                  >
                    {isAutopay ? (
                      <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-200">
                        {entry.amount !== null ? formatCurrency(entry.amount) : 'Paid'}
                      </span>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {getRelativeTime(entry.paid_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-500">
                        {formatPaymentDate(entry.paid_at)}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          isAutopay
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        )}
                      >
                        {isAutopay ? '💳 Autopay' : '✓ Manual'}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">{entry.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
