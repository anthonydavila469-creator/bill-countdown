'use client';

import { Bill } from '@/types';
import { useDueSoonAlerts } from '@/hooks/use-due-soon-alerts';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';

interface DueSoonBannerProps {
  bills: Bill[];
  className?: string;
}

export function DueSoonBanner({ bills, className }: DueSoonBannerProps) {
  const { dueSoonBills, totalDueSoon, isDismissed, dismiss } = useDueSoonAlerts(bills);

  // Don't render if no bills due soon, already dismissed, or not mounted (SSR)
  if (dueSoonBills.length === 0 || isDismissed) {
    return null;
  }

  const billCount = dueSoonBills.length;
  const billText = billCount === 1 ? '1 bill' : `${billCount} bills`;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'backdrop-blur-md bg-red-500/10 border border-red-500/20',
        'p-4 sm:p-5',
        className
      )}
    >
      {/* Animated gradient shimmer background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent animate-shimmer"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite',
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon with glow */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-red-500/30 rounded-full blur-md" />
            <div className="relative w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
          </div>

          {/* Text content */}
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold text-white">
              {billText} due within 3 days
            </p>
            <p className="text-xs sm:text-sm text-red-200/80">
              {formatCurrency(totalDueSoon)} total
            </p>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className={cn(
            'flex-shrink-0 p-2 rounded-xl',
            'bg-white/5 hover:bg-white/10 border border-white/10',
            'text-white/60 hover:text-white/90',
            'transition-all duration-200',
            'active:scale-95'
          )}
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
