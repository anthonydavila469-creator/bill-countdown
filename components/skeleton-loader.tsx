'use client';

import { cn } from '@/lib/utils';

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)} />;
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5', className)}>
      <SkeletonBlock className="h-4 w-2/5 mb-4" />
      <SkeletonBlock className="h-8 w-1/3 mb-3" />
      <SkeletonBlock className="h-3 w-3/5" />
    </div>
  );
}

export function BillCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn(
      'rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-white/[0.01] overflow-hidden',
      compact ? 'p-4' : 'p-5'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-10 h-10 rounded-xl" />
          <div>
            <SkeletonBlock className="h-4 w-24 mb-2" />
            <SkeletonBlock className="h-3 w-16" />
          </div>
        </div>
        <SkeletonBlock className="h-6 w-6 rounded-full" />
      </div>
      <div className="flex items-end justify-between">
        <SkeletonBlock className="h-7 w-20" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1">
            <SkeletonBlock className="h-4 w-32 mb-2" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <SkeletonBlock className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex flex-col items-center">
            <SkeletonBlock className="h-3 w-16 mb-3" />
            <SkeletonBlock className="h-10 w-12" />
          </div>
        ))}
      </div>

      {/* Controls skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <SkeletonBlock className="h-10 w-28 rounded-xl" />
        <SkeletonBlock className="h-10 w-24 rounded-xl" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <BillCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
