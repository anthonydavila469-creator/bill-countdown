'use client';

import { Bill, BillUrgency } from '@/types';
import { ProjectedBill } from '@/lib/calendar-utils';
import { cn, getDaysUntilDue, getUrgency } from '@/lib/utils';
import { isToday, isInMonth } from '@/lib/calendar-utils';

interface CalendarDayProps {
  date: Date;
  currentMonth: number;
  currentYear: number;
  bills: (Bill | ProjectedBill)[];
  isSelected: boolean;
  onClick: () => void;
  animationDelay?: number;
}

// Map urgency to CSS variable name
const urgencyVarMap: Record<BillUrgency, string> = {
  overdue: '--urgency-overdue',
  urgent: '--urgency-urgent',
  soon: '--urgency-soon',
  safe: '--urgency-safe',
  distant: '--urgency-distant',
};

export function CalendarDay({
  date,
  currentMonth,
  currentYear,
  bills,
  isSelected,
  onClick,
  animationDelay = 0,
}: CalendarDayProps) {
  const inCurrentMonth = isInMonth(date, currentYear, currentMonth);
  const today = isToday(date);
  const dayNumber = date.getDate();
  const hasBills = bills.length > 0;

  // Sort bills by urgency (most urgent first)
  const sortedBills = [...bills].sort((a, b) => {
    const daysA = getDaysUntilDue(a.due_date);
    const daysB = getDaysUntilDue(b.due_date);
    return daysA - daysB;
  });

  // Get the most urgent bill for the primary indicator
  const mostUrgentBill = sortedBills[0];
  const mostUrgentUrgency = mostUrgentBill ? getUrgency(getDaysUntilDue(mostUrgentBill.due_date)) : null;

  // Show up to 4 bills, then "+N"
  const visibleBills = sortedBills.slice(0, 4);
  const extraCount = Math.max(0, sortedBills.length - 4);

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-center justify-center p-2 sm:p-2.5 min-h-[68px] sm:min-h-[88px] transition-all duration-300',
        'border-r border-b border-white/[0.03] last:border-r-0',
        'hover:bg-white/[0.04]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-inset',
        // Fade out non-current month days
        !inCurrentMonth && 'opacity-25 hover:opacity-40',
        // Selected state - strong highlight with fill
        isSelected && 'bg-violet-500/20 border-violet-500/30',
        // Today - subtle background
        today && !isSelected && 'bg-blue-500/10'
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Today indicator ring */}
      {today && (
        <div className="absolute inset-1 rounded-xl border-2 border-blue-500/40 pointer-events-none" />
      )}

      {/* Selected indicator - stronger border */}
      {isSelected && (
        <div className="absolute inset-0.5 rounded-xl border-2 border-violet-400/70 pointer-events-none animate-in fade-in zoom-in-95 duration-200" />
      )}

      {/* Day number */}
      <span
        className={cn(
          'relative text-sm sm:text-base font-medium transition-colors duration-200',
          today
            ? 'text-blue-400 font-semibold'
            : isSelected
            ? 'text-white font-semibold'
            : inCurrentMonth
            ? 'text-zinc-300 group-hover:text-white'
            : 'text-zinc-600'
        )}
      >
        {dayNumber}
        {/* Subtle today dot */}
        {today && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
        )}
      </span>

      {/* Bill indicators */}
      {hasBills && (
        <div className="flex flex-col items-center gap-1.5 mt-2">
          {/* Primary urgency indicator bar - larger and more prominent */}
          {mostUrgentUrgency && (
            <div
              className={cn(
                'w-10 sm:w-12 h-1.5 rounded-full transition-all duration-300 shadow-md',
                // Pulse animation for overdue
                mostUrgentUrgency === 'overdue' && 'animate-pulse'
              )}
              style={{
                backgroundColor: `var(${urgencyVarMap[mostUrgentUrgency]})`,
                boxShadow: `0 4px 6px -1px color-mix(in srgb, var(${urgencyVarMap[mostUrgentUrgency]}) 60%, transparent)`,
              }}
            />
          )}

          {/* Bill dots row */}
          <div className="flex items-center justify-center gap-1.5">
            {visibleBills.map((bill, index) => {
              const daysLeft = getDaysUntilDue(bill.due_date);
              const urgency = getUrgency(daysLeft);
              const isProjected = 'isProjected' in bill && bill.isProjected;
              const cssVar = urgencyVarMap[urgency];

              return (
                <div
                  key={bill.id}
                  className={cn(
                    'w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-200',
                    // Projected bills are translucent with ring
                    isProjected && 'opacity-40 ring-1 ring-white/30',
                    // Stagger animation
                    'animate-in fade-in zoom-in duration-300'
                  )}
                  style={{
                    backgroundColor: `var(${cssVar})`,
                    boxShadow: isProjected ? undefined : `0 1px 2px color-mix(in srgb, var(${cssVar}) 60%, transparent)`,
                    animationDelay: `${animationDelay + index * 50}ms`,
                  }}
                  title={`${bill.name}${isProjected ? ' (projected)' : ''}`}
                />
              );
            })}

            {/* Extra count badge */}
            {extraCount > 0 && (
              <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400 ml-0.5">
                +{extraCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hover effect overlay */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 bg-gradient-to-t from-white/[0.02] to-transparent transition-opacity duration-300 pointer-events-none" />
    </button>
  );
}
