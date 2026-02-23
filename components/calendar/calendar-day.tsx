'use client';

import { useState, DragEvent } from 'react';
import { Bill, BillUrgency } from '@/types';
import { ProjectedBill, formatDateString } from '@/lib/calendar-utils';
import { cn, getDaysUntilDue, getUrgency, formatCurrency } from '@/lib/utils';
import { isToday, isInMonth } from '@/lib/calendar-utils';
import { getBillIcon } from '@/lib/get-bill-icon';
import { RefreshCw, DollarSign } from 'lucide-react';

interface CalendarDayProps {
  date: Date;
  currentMonth: number;
  currentYear: number;
  bills: (Bill | ProjectedBill)[];
  isSelected: boolean;
  onClick: () => void;
  animationDelay?: number;
  onBillDrop?: (billId: string, newDate: string) => void;
  isPayday?: boolean;
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
  onBillDrop,
  isPayday = false,
}: CalendarDayProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inCurrentMonth = isInMonth(date, currentYear, currentMonth);
  const today = isToday(date);
  const dayNumber = date.getDate();
  const hasBills = bills.length > 0;
  const dateString = formatDateString(date);

  // Drag handlers for the day cell (drop target)
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const billId = e.dataTransfer.getData('text/plain');
    const originalDate = e.dataTransfer.getData('original-date');

    if (billId && originalDate !== dateString && onBillDrop) {
      onBillDrop(billId, dateString);
    }
  };

  // Drag handlers for bill chips
  const handleDragStart = (e: DragEvent<HTMLDivElement>, bill: Bill | ProjectedBill) => {
    const isProjected = 'isProjected' in bill && bill.isProjected;
    if (bill.is_paid || isProjected) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('text/plain', bill.id);
    e.dataTransfer.setData('original-date', bill.due_date);
    e.dataTransfer.effectAllowed = 'move';

    // Create a custom drag image
    const dragElement = e.currentTarget.cloneNode(true) as HTMLElement;
    dragElement.style.position = 'absolute';
    dragElement.style.top = '-1000px';
    dragElement.style.opacity = '0.9';
    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, 10, 10);
    setTimeout(() => document.body.removeChild(dragElement), 0);
  };

  // Sort bills by urgency (most urgent first), unpaid before paid
  const sortedBills = [...bills].sort((a, b) => {
    // Unpaid first
    if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1;
    // Then by urgency
    const daysA = getDaysUntilDue(a.due_date);
    const daysB = getDaysUntilDue(b.due_date);
    return daysA - daysB;
  });

  // Show up to 2 bill chips on desktop, 1 on mobile, then "+N more"
  const visibleBillsDesktop = sortedBills.slice(0, 2);
  const visibleBillsMobile = sortedBills.slice(0, 1);
  const extraCountDesktop = Math.max(0, sortedBills.length - 2);
  const extraCountMobile = Math.max(0, sortedBills.length - 1);

  // Calculate total for the day
  const dayTotal = bills.reduce((sum, bill) => {
    const isProjected = 'isProjected' in bill && bill.isProjected;
    if (!isProjected && !bill.is_paid) {
      return sum + (bill.amount || 0);
    }
    return sum;
  }, 0);

  return (
    <div
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'group relative flex flex-col p-1 md:p-2 min-h-[60px] sm:min-h-[80px] md:min-h-[110px] transition-all duration-300 cursor-pointer',
        'border-r border-b border-white/[0.04]',
        'hover:bg-white/[0.03]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-inset',
        // Fade out non-current month days
        !inCurrentMonth && 'opacity-30 hover:opacity-50',
        // Selected state
        isSelected && 'bg-violet-400/15',
        // Today
        today && !isSelected && 'bg-violet-500/[0.08]',
        // Drag over state
        isDragOver && 'bg-emerald-500/20 ring-2 ring-emerald-400/50 ring-inset'
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Today indicator */}
      {today && (
        <div className="absolute inset-1 rounded-lg border-2 border-violet-500/30 pointer-events-none" />
      )}

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute inset-0.5 rounded-lg border-2 border-violet-300/60 pointer-events-none" />
      )}

      {/* Drop zone indicator */}
      {isDragOver && (
        <div className="absolute inset-2 rounded-md border-2 border-dashed border-emerald-400/60 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">Drop here</span>
        </div>
      )}

      {/* Payday marker */}
      {isPayday && inCurrentMonth && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 pointer-events-none">
          <DollarSign className="w-2.5 h-2.5 text-emerald-400" />
          <span className="text-[9px] font-bold text-emerald-300 uppercase">Pay</span>
        </div>
      )}

      {/* Header row: day number and total */}
      <div className="flex items-start justify-between mb-0.5 sm:mb-1">
        <span
          className={cn(
            'text-xs sm:text-sm font-semibold transition-colors duration-200',
            today
              ? 'text-violet-400'
              : isSelected
              ? 'text-white'
              : inCurrentMonth
              ? 'text-zinc-400 group-hover:text-zinc-200'
              : 'text-zinc-600'
          )}
        >
          {dayNumber}
        </span>

        {/* Day total - only show on larger screens (md+) */}
        {dayTotal > 0 && inCurrentMonth && !isDragOver && (
          <span className="hidden md:inline text-[10px] font-semibold text-zinc-500 group-hover:text-zinc-400 transition-colors">
            {formatCurrency(dayTotal)}
          </span>
        )}
      </div>

      {/* Bill chips - Desktop (md+) */}
      {hasBills && !isDragOver && (
        <>
          {/* Desktop view - show 2 bills with names */}
          <div className="hidden md:flex flex-col gap-1 flex-1 min-h-0">
            {visibleBillsDesktop.map((bill, index) => {
              const daysLeft = getDaysUntilDue(bill.due_date);
              const urgency = getUrgency(daysLeft);
              const isProjected = 'isProjected' in bill && bill.isProjected;
              const cssVar = urgencyVarMap[urgency];
              const isDraggable = !bill.is_paid && !isProjected;
              const { icon: BillIcon, colorClass } = getBillIcon(bill);

              return (
                <div
                  key={bill.id}
                  draggable={isDraggable}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleDragStart(e, bill);
                  }}
                  className={cn(
                    'relative flex items-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium',
                    'transition-all duration-200 overflow-hidden',
                    isProjected && 'opacity-60',
                    bill.is_paid && 'opacity-40 line-through',
                    isDraggable && 'cursor-grab active:cursor-grabbing hover:ring-1 hover:ring-white/30 active:scale-95'
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, var(${cssVar}) 15%, transparent)`,
                    borderLeft: `3px solid var(${cssVar})`,
                    animationDelay: `${animationDelay + index * 50}ms`,
                  }}
                  title={`${bill.name}${bill.amount ? ` - ${formatCurrency(bill.amount)}` : ''}${isProjected ? ' (projected)' : ''}${isDraggable ? ' • Drag to reschedule' : ''}`}
                >
                  <BillIcon className={cn('w-3 h-3 flex-shrink-0', colorClass)} />
                  <span
                    className={cn('truncate flex-1 min-w-0', bill.is_paid ? 'text-zinc-500' : 'text-zinc-200')}
                    style={{ color: bill.is_paid ? undefined : `color-mix(in srgb, var(${cssVar}) 90%, white)` }}
                  >
                    {bill.name}
                    {bill.amount && !bill.is_paid && (
                      <span className="text-zinc-400 ml-1">· ${Math.round(bill.amount)}</span>
                    )}
                  </span>
                  {isProjected && <RefreshCw className="w-2.5 h-2.5 text-zinc-500 flex-shrink-0" />}
                </div>
              );
            })}
            {extraCountDesktop > 0 && (
              <div className="flex items-center justify-center">
                <span className="text-[9px] font-semibold text-zinc-500 bg-white/[0.05] px-2 py-0.5 rounded-full">
                  +{extraCountDesktop} more
                </span>
              </div>
            )}
          </div>

          {/* Mobile view - compact icon-only pills */}
          <div className="flex md:hidden flex-wrap gap-0.5 mt-0.5">
            {visibleBillsMobile.map((bill, index) => {
              const daysLeft = getDaysUntilDue(bill.due_date);
              const urgency = getUrgency(daysLeft);
              const isProjected = 'isProjected' in bill && bill.isProjected;
              const cssVar = urgencyVarMap[urgency];
              const { icon: BillIcon, colorClass } = getBillIcon(bill);

              return (
                <div
                  key={bill.id}
                  className={cn(
                    'flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium',
                    isProjected && 'opacity-60',
                    bill.is_paid && 'opacity-40'
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, var(${cssVar}) 20%, transparent)`,
                    borderLeft: `2px solid var(${cssVar})`,
                  }}
                  title={bill.name}
                >
                  <BillIcon className={cn('w-2.5 h-2.5', colorClass)} />
                  <span className="truncate max-w-[3ch]" style={{ color: `var(${cssVar})` }}>
                    {bill.name.substring(0, 2)}..
                  </span>
                </div>
              );
            })}
            {extraCountMobile > 0 && (
              <span className="text-[8px] font-semibold text-zinc-500 px-1">
                +{extraCountMobile}
              </span>
            )}
          </div>
        </>
      )}

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 bg-gradient-to-t from-white/[0.02] to-transparent transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}
