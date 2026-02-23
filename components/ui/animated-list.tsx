'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  isExiting?: boolean;
  onExitComplete?: () => void;
  /** Delay index for staggered animations (0, 1, 2, etc.) */
  staggerIndex?: number;
  /** Base delay in ms between staggered items */
  staggerDelay?: number;
}

/**
 * AnimatedListItem - Silky smooth enter/exit animations for list items
 *
 * Features a spring-like enter with subtle overshoot and a satisfying exit sweep.
 * The animation feels premium and intentional, not generic.
 */
export function AnimatedListItem({
  children,
  className,
  isExiting = false,
  onExitComplete,
  staggerIndex = 0,
  staggerDelay = 50,
}: AnimatedListItemProps) {
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const ref = useRef<HTMLDivElement>(null);

  // Handle enter animation
  useEffect(() => {
    const delay = staggerIndex * staggerDelay;
    const timer = setTimeout(() => {
      setAnimationState('visible');
    }, delay + 20); // Small buffer for DOM paint
    return () => clearTimeout(timer);
  }, [staggerIndex, staggerDelay]);

  // Handle exit animation
  useEffect(() => {
    if (isExiting && animationState !== 'exiting') {
      setAnimationState('exiting');
      const timer = setTimeout(() => {
        onExitComplete?.();
      }, 350); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isExiting, animationState, onExitComplete]);

  return (
    <div
      ref={ref}
      className={cn(
        'transform-gpu will-change-transform',
        // Enter state - starts invisible and shifted
        animationState === 'entering' && 'opacity-0 translate-y-3 scale-[0.98]',
        // Visible state - smooth transition in
        animationState === 'visible' && 'opacity-100 translate-y-0 scale-100 transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        // Exit state - sweep out to the right with fade
        animationState === 'exiting' && 'opacity-0 translate-x-8 scale-[0.96] transition-all duration-300 ease-[cubic-bezier(0.4,0,1,1)]',
        className
      )}
      style={{
        transitionDelay: animationState === 'entering' ? `${staggerIndex * staggerDelay}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
}

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * AnimatedList - Container for animated list items
 * Provides consistent spacing and layout
 */
export function AnimatedList({ children, className, gap = 'md' }: AnimatedListProps) {
  const gapClasses = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
  };

  return (
    <div className={cn(gapClasses[gap], className)}>
      {children}
    </div>
  );
}

interface SpinnerProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'default' | 'light' | 'accent';
}

/**
 * Spinner - Premium loading indicator
 *
 * Features a dual-ring design with offset rotation speeds
 * creating a mesmerizing, high-end feel.
 */
export function Spinner({ className, size = 'sm', variant = 'default' }: SpinnerProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const ringThickness = {
    xs: '1.5',
    sm: '2',
    md: '2',
    lg: '2.5',
  };

  const colors = {
    default: {
      track: 'stroke-white/10',
      spinner: 'stroke-white/60',
    },
    light: {
      track: 'stroke-black/10',
      spinner: 'stroke-black/60',
    },
    accent: {
      track: 'stroke-violet-500/20',
      spinner: 'stroke-violet-400',
    },
  };

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Outer ring - slower rotation */}
      <svg
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: '1.2s' }}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          className={colors[variant].track}
          strokeWidth={ringThickness[size]}
        />
        <path
          d="M12 2C6.48 2 2 6.48 2 12"
          className={colors[variant].spinner}
          strokeWidth={ringThickness[size]}
          strokeLinecap="round"
        />
      </svg>
      {/* Inner glow for accent variant */}
      {variant === 'accent' && (
        <div
          className="absolute inset-0 rounded-full blur-sm opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(45,212,191,0.4) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
}

/**
 * PulseLoader - Alternative loading state with pulsing dots
 * Great for inline loading indicators
 */
interface PulseLoaderProps {
  className?: string;
  size?: 'sm' | 'md';
}

export function PulseLoader({ className, size = 'sm' }: PulseLoaderProps) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            dotSize,
            'rounded-full bg-gradient-to-br from-violet-400 to-violet-300',
            'animate-pulse'
          )}
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonPulse - Skeleton loading placeholder with shimmer effect
 */
interface SkeletonPulseProps {
  className?: string;
}

export function SkeletonPulse({ className }: SkeletonPulseProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-white/[0.03]',
        className
      )}
    >
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        }}
      />
    </div>
  );
}

/**
 * ButtonSpinner - Specifically designed for button loading states
 * Replaces button text seamlessly
 */
interface ButtonSpinnerProps {
  className?: string;
  text?: string;
}

export function ButtonSpinner({ className, text = 'Loading...' }: ButtonSpinnerProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Spinner size="sm" variant="light" />
      <span>{text}</span>
    </span>
  );
}
