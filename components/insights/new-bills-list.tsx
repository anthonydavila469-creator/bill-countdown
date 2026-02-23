'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown, Plus } from 'lucide-react';
import { NewBillItem } from '@/lib/insights-utils';
import { formatCurrency, cn } from '@/lib/utils';
import { getIconFromName } from '@/lib/get-bill-icon';

interface NewBillsListProps {
  newBills: NewBillItem[];
}

const MAX_VISIBLE = 5;

export function NewBillsList({ newBills }: NewBillsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (newBills.length === 0) {
    return null;
  }

  const hasMore = newBills.length > MAX_VISIBLE;
  const visibleBills = isExpanded ? newBills : newBills.slice(0, MAX_VISIBLE);
  const hiddenCount = newBills.length - MAX_VISIBLE;

  // Calculate total of new bills
  const totalNewBills = newBills.reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <div
      className="relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: '375ms', animationFillMode: 'backwards' }}
    >
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02]" />

      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400/60 via-yellow-500/60 to-violet-500/30" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-400/20 to-yellow-500/20 border border-violet-400/30">
              <Sparkles className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">New Bills This Month</h3>
              <p className="text-xs text-zinc-500">
                {newBills.length} {newBills.length === 1 ? 'bill' : 'bills'} · {formatCurrency(totalNewBills)} total
              </p>
            </div>
          </div>

          {/* Badge showing new count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-400/10 border border-violet-400/20">
            <Plus className="w-3.5 h-3.5 text-violet-300" />
            <span className="text-xs font-semibold text-violet-300">{newBills.length} new</span>
          </div>
        </div>

        {/* Bills list */}
        <div className="space-y-2">
          {visibleBills.map((bill, index) => {
            const { icon: BillIcon, colorClass } = getIconFromName(bill.name);
            return (
              <div
                key={bill.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.03] transition-all duration-200 group animate-in fade-in slide-in-from-left-2"
                style={{ animationDelay: `${450 + index * 40}ms`, animationFillMode: 'backwards' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    <BillIcon className={cn("w-5 h-5", colorClass)} />
                  </div>
                  <span className="text-sm font-medium text-white">{bill.name}</span>
                </div>
                <span className="text-sm font-semibold text-zinc-300">{formatCurrency(bill.amount)}</span>
              </div>
            );
          })}
        </div>

        {/* Show more / less button */}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'w-full mt-4 py-2.5 rounded-xl flex items-center justify-center gap-2',
              'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/10',
              'text-sm font-medium text-zinc-400 hover:text-white',
              'transition-all duration-200'
            )}
          >
            <span>{isExpanded ? 'Show less' : `Show ${hiddenCount} more`}</span>
            <ChevronDown className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} />
          </button>
        )}
      </div>
    </div>
  );
}
