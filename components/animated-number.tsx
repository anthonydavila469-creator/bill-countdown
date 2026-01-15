'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
}

/**
 * Animated number that smoothly transitions between values
 * Uses a rolling/counting animation effect
 */
export function AnimatedNumber({
  value,
  className,
  duration = 500,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;

    setIsAnimating(true);
    const startValue = previousValue.current;
    const endValue = value;
    const diff = endValue - startValue;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(startValue + diff * eased);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        previousValue.current = value;
      }
    };

    requestAnimationFrame(animate);

    return () => {
      previousValue.current = value;
    };
  }, [value, duration]);

  return (
    <span
      className={cn(
        'tabular-nums transition-transform',
        isAnimating && 'scale-105',
        className
      )}
    >
      {displayValue}
    </span>
  );
}

interface FlipDigitProps {
  digit: string;
  delay?: number;
}

/**
 * Single digit with flip animation
 */
function FlipDigit({ digit, delay = 0 }: FlipDigitProps) {
  const [currentDigit, setCurrentDigit] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (currentDigit !== digit) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setCurrentDigit(digit);
        setIsFlipping(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [digit, currentDigit]);

  return (
    <span
      className={cn(
        'inline-block transition-transform duration-150',
        isFlipping && 'scale-y-0'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {currentDigit}
    </span>
  );
}

interface FlipNumberProps {
  value: number;
  className?: string;
}

/**
 * Number display with flip animation for each digit
 */
export function FlipNumber({ value, className }: FlipNumberProps) {
  const digits = Math.abs(value).toString().split('');
  const isNegative = value < 0;

  return (
    <span className={cn('inline-flex', className)}>
      {isNegative && <span>-</span>}
      {digits.map((digit, index) => (
        <FlipDigit key={index} digit={digit} delay={index * 50} />
      ))}
    </span>
  );
}

interface CountdownTimerProps {
  targetDate: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Live countdown timer that updates every second
 * Shows days, hours, minutes, seconds
 */
export function CountdownTimer({
  targetDate,
  className,
  size = 'md',
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const labelClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <TimeUnit
        value={timeLeft.days}
        label="days"
        sizeClass={sizeClasses[size]}
        labelClass={labelClasses[size]}
      />
      <Separator size={size} />
      <TimeUnit
        value={timeLeft.hours}
        label="hrs"
        sizeClass={sizeClasses[size]}
        labelClass={labelClasses[size]}
      />
      <Separator size={size} />
      <TimeUnit
        value={timeLeft.minutes}
        label="min"
        sizeClass={sizeClasses[size]}
        labelClass={labelClasses[size]}
      />
      <Separator size={size} />
      <TimeUnit
        value={timeLeft.seconds}
        label="sec"
        sizeClass={sizeClasses[size]}
        labelClass={labelClasses[size]}
        animate
      />
    </div>
  );
}

function TimeUnit({
  value,
  label,
  sizeClass,
  labelClass,
  animate = false,
}: {
  value: number;
  label: string;
  sizeClass: string;
  labelClass: string;
  animate?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          'font-bold tabular-nums text-white',
          sizeClass,
          animate && 'transition-all duration-300'
        )}
      >
        {value.toString().padStart(2, '0')}
      </span>
      <span className={cn('uppercase tracking-wider text-zinc-500', labelClass)}>
        {label}
      </span>
    </div>
  );
}

function Separator({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const dotSize = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className={cn('rounded-full bg-zinc-600', dotSize[size])} />
      <div className={cn('rounded-full bg-zinc-600', dotSize[size])} />
    </div>
  );
}
