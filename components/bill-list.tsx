'use client';

import { Bill } from '@/types';
import { BillCard, BillListItem } from './bill-card';
import { cn } from '@/lib/utils';

interface BillListProps {
  bills: Bill[];
  view?: 'grid' | 'list';
  onBillClick?: (bill: Bill) => void;
  className?: string;
}

export function BillList({
  bills,
  view = 'grid',
  onBillClick,
  className,
}: BillListProps) {
  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          No bills due!
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
          You&apos;re all caught up. Add a new bill to start tracking your
          upcoming payments.
        </p>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {bills.map((bill, index) => (
          <div
            key={bill.id}
            className="animate-in fade-in slide-in-from-bottom-2"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: 'backwards',
            }}
          >
            <BillListItem
              bill={bill}
              onClick={() => onBillClick?.(bill)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {bills.map((bill, index) => (
        <div
          key={bill.id}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{
            animationDelay: `${index * 75}ms`,
            animationFillMode: 'backwards',
          }}
        >
          <BillCard
            bill={bill}
            onClick={() => onBillClick?.(bill)}
          />
        </div>
      ))}
    </div>
  );
}
