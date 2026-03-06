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
  urgency,
  children,
  className,
  onClick,
}: GradientCardProps) {
  const isOverdue = urgency === 'overdue';
  const isUrgent = urgency === 'urgent';

  return (
    <div
      onClick={onClick}
      className={cn(
        // Base card structure — glassmorphism
        'group relative overflow-hidden rounded-3xl h-full',
        'backdrop-blur-xl',
        // Shadow and glow effect
        'shadow-xl',
        // Hover animations
        'transition-all duration-300 ease-out',
        'hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1',
        // Overdue: dark crimson card
        isOverdue && 'bg-[rgba(127,29,29,0.4)]',
        // Urgent (<=3 days): pulsing amber border
        isUrgent && 'animate-pulse-amber',
        // Cursor
        onClick && 'cursor-pointer',
        className
      )}
      style={{
        // Glassmorphism: translucent background with violet inner border
        ...(!isOverdue ? {
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        } : {
          border: '1px solid rgba(239, 68, 68, 0.4)',
        }),
        boxShadow: isOverdue
          ? '0 8px 32px rgba(127, 29, 29, 0.4)'
          : 'var(--card-glow)',
      }}
    >

      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Glossy highlight at top */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

      {/* Subtle inner border for glass effect */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/[0.08] pointer-events-none" />

      {/* Animated shine on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.04] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
