'use client';

import { cn } from '@/lib/utils';
import { BillUrgency } from '@/types';

interface CountdownDisplayProps {
  daysLeft: number;
  urgency: BillUrgency;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: {
    number: 'text-4xl',
    label: 'text-xs',
    gap: 'gap-0',
  },
  md: {
    number: 'text-6xl',
    label: 'text-sm',
    gap: 'gap-0.5',
  },
  lg: {
    number: 'text-7xl md:text-8xl',
    label: 'text-base',
    gap: 'gap-1',
  },
};

export function CountdownDisplay({
  daysLeft,
  urgency,
  size = 'md',
  className,
}: CountdownDisplayProps) {
  const styles = sizeStyles[size];
  const isOverdue = daysLeft < 0;
  const displayNumber = Math.abs(daysLeft);

  // Determine label text
  const getLabel = () => {
    if (daysLeft === 0) return 'today';
    if (isOverdue) {
      return displayNumber === 1 ? 'day overdue' : 'days overdue';
    }
    return displayNumber === 1 ? 'day left' : 'days left';
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        styles.gap,
        className
      )}
    >
      {/* Large countdown number */}
      <div className="relative">
        {/* Number with bold, impactful styling */}
        <span
          className={cn(
            styles.number,
            'font-black tracking-tight text-white',
            // Text shadow for depth
            'drop-shadow-lg',
            // Subtle animation on the number
            'transition-transform duration-300',
            'group-hover:scale-105'
          )}
          style={{
            fontFamily: "'SF Pro Display', 'Inter', system-ui, sans-serif",
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
        >
          {displayNumber}
        </span>

        {/* Pulsing indicator for urgent/overdue */}
        {(urgency === 'overdue' || urgency === 'urgent') && (
          <span className="absolute -right-2 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
        )}
      </div>

      {/* Label text */}
      <span
        className={cn(
          styles.label,
          'font-semibold uppercase tracking-widest',
          'text-white/90'
        )}
      >
        {getLabel()}
      </span>
    </div>
  );
}
