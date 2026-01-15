'use client';

import { cn } from '@/lib/utils';
import { BillUrgency } from '@/types';
import { ReactNode } from 'react';

// Map urgency to CSS variable name
const urgencyVarMap: Record<BillUrgency, string> = {
  overdue: '--urgency-overdue',
  urgent: '--urgency-urgent',
  soon: '--urgency-soon',
  safe: '--urgency-safe',
  distant: '--urgency-distant',
};

// Helper to adjust color brightness for gradient
function adjustColorBrightness(cssVar: string, percent: number) {
  return `color-mix(in srgb, var(${cssVar}) ${percent}%, black)`;
}

interface GradientCardProps {
  urgency: BillUrgency;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GradientCard({
  urgency,
  children,
  className,
  onClick,
}: GradientCardProps) {
  const cssVar = urgencyVarMap[urgency];

  // Create gradient using CSS variable
  const gradientStyle = {
    background: `linear-gradient(135deg, var(${cssVar}) 0%, ${adjustColorBrightness(cssVar, 85)} 50%, ${adjustColorBrightness(cssVar, 70)} 100%)`,
    boxShadow: `0 20px 25px -5px color-mix(in srgb, var(${cssVar}) 25%, transparent)`,
  };

  return (
    <div
      onClick={onClick}
      style={gradientStyle}
      className={cn(
        // Base card structure
        'group relative overflow-hidden rounded-3xl',
        // Shadow and glow effect
        'shadow-xl',
        // Hover animations
        'transition-all duration-300 ease-out',
        'hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1',
        // Cursor
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Glossy highlight at top */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />

      {/* Subtle inner border for glass effect */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/20" />

      {/* Animated shine on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
