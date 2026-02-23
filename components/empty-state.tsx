'use client';

import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-16 px-6',
      'rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-sm',
      className
    )}>
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-xs mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-violet-500 to-violet-400 hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/20"
        >
          <Plus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function NoBillsEmpty({ onAddBill }: { onAddBill: () => void }) {
  return (
    <EmptyState
      icon="📭"
      title="No bills yet"
      description="Connect Gmail or add your first bill to start tracking due dates."
      actionLabel="Add Bill"
      onAction={onAddBill}
    />
  );
}

export function AllPaidEmpty() {
  return (
    <EmptyState
      icon="🎉"
      title="You're all caught up!"
      description="All bills are paid this month. Nice work!"
    />
  );
}

export function NoUpcomingEmpty({ nextDueInDays }: { nextDueInDays?: number }) {
  return (
    <EmptyState
      icon="😌"
      title="Nothing due soon"
      description={nextDueInDays ? `Your next bill is due in ${nextDueInDays} days.` : 'No upcoming bills to worry about.'}
    />
  );
}
