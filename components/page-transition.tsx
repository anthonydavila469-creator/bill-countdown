'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Page transition wrapper with fade-in animation
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        className
      )}
    >
      {children}
    </div>
  );
}

interface StaggeredListProps {
  children: React.ReactNode[];
  delay?: number;
  className?: string;
}

/**
 * List with staggered animation for each child
 */
export function StaggeredList({
  children,
  delay = 75,
  className,
}: StaggeredListProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-in fade-in slide-in-from-bottom-4"
          style={{
            animationDelay: `${index * delay}ms`,
            animationFillMode: 'backwards',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Loading skeleton component
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-white/5 rounded-lg',
        className
      )}
    />
  );
}

/**
 * Bill card skeleton for loading states
 */
export function BillCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <Skeleton className="h-16 w-24" />
      </div>
      <div className="mt-4 flex justify-center">
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

/**
 * Bill list item skeleton
 */
export function BillListItemSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
      <Skeleton className="w-3 h-12 rounded-full" />
      <Skeleton className="w-10 h-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-6 w-12 ml-auto" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

/**
 * Stats card skeleton
 */
export function StatsCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-28" />
    </div>
  );
}

/**
 * Dashboard loading skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="p-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Bill cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <BillCardSkeleton />
        <BillCardSkeleton />
        <BillCardSkeleton />
        <BillCardSkeleton />
        <BillCardSkeleton />
        <BillCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Pulse animation for urgent items
 */
export function PulseIndicator({
  className,
  color = 'blue',
}: {
  className?: string;
  color?: 'blue' | 'red' | 'orange' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    green: 'bg-emerald-500',
  };

  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      <span
        className={cn(
          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
          colorClasses[color]
        )}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full h-3 w-3',
          colorClasses[color]
        )}
      />
    </span>
  );
}

/**
 * Confetti animation for celebrations
 */
export function Confetti({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: [
              '#3b82f6',
              '#8b5cf6',
              '#10b981',
              '#f59e0b',
              '#ef4444',
              '#ec4899',
            ][Math.floor(Math.random() * 6)],
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}
