'use client';

import { cn } from '@/lib/utils';
import { BillUrgency } from '@/types';
import { ReactNode } from 'react';

interface GradientCardProps {
  urgency?: BillUrgency;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GradientCard({
  children,
  className,
  onClick,
}: GradientCardProps) {

  // Dark base layer for card background with subtle shadow
  const cardStyle = {
    background: 'var(--card-gradient)',
    boxShadow: 'var(--card-glow)',
  };

  return (
    <div
      onClick={onClick}
      style={cardStyle}
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
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Glossy highlight at top */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      {/* Subtle inner border for glass effect */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 pointer-events-none" />

      {/* Animated shine on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
