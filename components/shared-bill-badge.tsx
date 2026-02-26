'use client';

import { cn, formatCurrency } from '@/lib/utils';
import { SharedBill } from '@/hooks/use-shared-bills';
import { Users } from 'lucide-react';

interface SharedBillBadgeProps {
  sharedBill: SharedBill;
  variant?: 'default' | 'compact';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function SharedBillBadge({
  sharedBill,
  variant = 'default',
  className,
}: SharedBillBadgeProps) {
  const { partnerName, splitType, yourAmount, theirAmount, status } = sharedBill;
  const initials = getInitials(partnerName);

  // Determine who owes whom
  const youOweMore = yourAmount > theirAmount;
  const theyOweMore = theirAmount > yourAmount;
  const isEven = yourAmount === theirAmount;

  // Color coding based on who owes
  const colorClasses = theyOweMore
    ? 'text-emerald-300' // They owe you - green
    : youOweMore
      ? 'text-amber-300' // You owe them - amber
      : 'text-white/80'; // Even split - neutral

  const bgClasses = theyOweMore
    ? 'bg-emerald-500/10 border-emerald-500/30'
    : youOweMore
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-white/10 border-white/20';

  // Status indicator
  const statusLabel = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    paid: 'Paid',
  }[status];

  const statusColor = {
    pending: 'text-amber-400',
    confirmed: 'text-blue-400',
    paid: 'text-emerald-400',
  }[status];

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
          'bg-white/10 backdrop-blur-sm border border-white/20',
          'transition-all duration-200',
          className
        )}
      >
        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white">{initials}</span>
        </div>
        <span className="text-[10px] font-medium text-white/80">
          {splitType === '50/50' ? '50/50' : `You: ${formatCurrency(yourAmount)}`}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-xl',
        'bg-white/10 backdrop-blur-sm border border-white/20',
        'transition-all duration-200',
        className
      )}
    >
      {/* Partner avatar with initials */}
      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-white">{initials}</span>
      </div>

      {/* Split info */}
      <div className="flex flex-col min-w-0">
        <span className={cn('text-xs font-medium truncate', colorClasses)}>
          {splitType === '50/50' ? (
            `Split 50/50 with ${partnerName}`
          ) : theyOweMore ? (
            `${partnerName} owes ${formatCurrency(theirAmount)}`
          ) : youOweMore ? (
            `You owe ${formatCurrency(yourAmount)}`
          ) : (
            `Even split with ${partnerName}`
          )}
        </span>
        {status !== 'paid' && (
          <span className={cn('text-[10px]', statusColor)}>
            {statusLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// Inline badge for detail modal
export function SharedBillInlineBadge({
  sharedBill,
  className,
}: {
  sharedBill: SharedBill;
  className?: string;
}) {
  const { partnerName, yourAmount, theirAmount, status } = sharedBill;
  const initials = getInitials(partnerName);

  const theyOweMore = theirAmount > yourAmount;
  const youOweMore = yourAmount > theirAmount;

  const bgClasses = theyOweMore
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : youOweMore
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-white/5 border-white/10';

  const textColor = theyOweMore
    ? 'text-emerald-400'
    : youOweMore
      ? 'text-amber-400'
      : 'text-zinc-300';

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border',
        bgClasses,
        className
      )}
    >
      <Users className="w-5 h-5 text-zinc-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-500">Shared with</p>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[8px] font-bold text-white">{initials}</span>
          </div>
          <p className={cn('font-medium', textColor)}>
            {partnerName}
            {theyOweMore && ` owes ${formatCurrency(theirAmount)}`}
            {youOweMore && ` — You owe ${formatCurrency(yourAmount)}`}
            {!theyOweMore && !youOweMore && ` — Split evenly`}
          </p>
        </div>
      </div>
      <span className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-full',
        status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
        status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
        'bg-amber-500/20 text-amber-400'
      )}>
        {status === 'paid' ? 'Paid' : status === 'confirmed' ? 'Confirmed' : 'Pending'}
      </span>
    </div>
  );
}
