'use client';

import { cn } from '@/lib/utils';
import { BillUrgency, NumberColorMode } from '@/types';

// Map urgency to CSS variable names for gradients
const urgencyGradientVarMap: Record<BillUrgency, { from: string; to: string }> = {
  overdue: { from: '--urgency-overdue-from', to: '--urgency-overdue-to' },
  urgent: { from: '--urgency-urgent-from', to: '--urgency-urgent-to' },
  soon: { from: '--urgency-soon-from', to: '--urgency-soon-to' },
  safe: { from: '--urgency-safe-from', to: '--urgency-safe-to' },
  distant: { from: '--urgency-distant-from', to: '--urgency-distant-to' },
};

// Map urgency to CSS variable name (solid color)
const urgencyVarMap: Record<BillUrgency, string> = {
  overdue: '--urgency-overdue',
  urgent: '--urgency-urgent',
  soon: '--urgency-soon',
  safe: '--urgency-safe',
  distant: '--urgency-distant',
};

interface CountdownDisplayProps {
  daysLeft: number;
  urgency: BillUrgency;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  colorMode?: NumberColorMode;
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
  colorMode = 'white',
}: CountdownDisplayProps) {
  const styles = sizeStyles[size];
  const isOverdue = daysLeft < 0;
  const displayNumber = Math.abs(daysLeft);
  const urgencyCssVar = urgencyVarMap[urgency];
  const urgencyGradientVars = urgencyGradientVarMap[urgency];

  // Determine label text
  const getLabel = () => {
    if (daysLeft === 0) return 'today';
    if (isOverdue) {
      return displayNumber === 1 ? 'day overdue' : 'days overdue';
    }
    return displayNumber === 1 ? 'day left' : 'days left';
  };

  // Get number styles based on color mode
  const getNumberStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontFamily: "'SF Pro Display', 'Inter', system-ui, sans-serif",
      fontVariantNumeric: 'tabular-nums',
    };

    switch (colorMode) {
      case 'gradient':
        return {
          ...baseStyle,
          backgroundImage: `linear-gradient(160deg, var(${urgencyGradientVars.from}) 0%, var(${urgencyGradientVars.to}) 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        };
      case 'urgency':
        return {
          ...baseStyle,
          color: `var(${urgencyCssVar})`,
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
        };
      case 'white':
      default:
        return {
          ...baseStyle,
          color: 'white',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
        };
    }
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
            'font-black tracking-tight',
            'drop-shadow-lg',
            'transition-transform duration-300',
            'group-hover:scale-105'
          )}
          style={getNumberStyle()}
        >
          {displayNumber}
        </span>

        {/* Pulsing indicator for urgent/overdue - uses urgency color */}
        {(urgency === 'overdue' || urgency === 'urgent') && (
          <span className="absolute -right-2 -top-1 flex h-3 w-3">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: `var(${urgencyCssVar})` }}
            />
            <span
              className="relative inline-flex h-3 w-3 rounded-full"
              style={{ backgroundColor: `var(${urgencyCssVar})` }}
            />
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
