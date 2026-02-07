'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency, getDaysUntilDue } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Filter types (simplified - controlled via summary cards only)
type CalendarFilter = 'all' | 'overdue' | 'due-soon';
import { Bill } from '@/types';
import {
  getMonthGrid,
  formatMonthYear,
  getPreviousMonth,
  getNextMonth,
  getDayNames,
  getBillsForDate,
  projectRecurringBills,
  formatDateString,
  ProjectedBill,
} from '@/lib/calendar-utils';
import { CalendarDay } from './calendar-day';
import { DayDetailPanel } from './day-detail-panel';

interface CalendarGridProps {
  bills: Bill[];
  onBillClick: (bill: Bill) => void;
  onAddBill: (date?: Date) => void;
  onMarkPaid?: (bill: Bill) => void;
  onEdit?: (bill: Bill) => void;
  onReschedule?: (billId: string, newDate: string, originalDate: string) => void;
  getMutationState?: (billId: string) => import('@/contexts/bills-context').MutationState;
  paydayDate?: string | null;
}

export function CalendarGrid({ bills, onBillClick, onAddBill, onMarkPaid, onEdit, onReschedule, getMutationState, paydayDate }: CalendarGridProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>('all');
  const [mounted, setMounted] = useState(false);

  // Wait for client mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);


  // Generate month grid
  const monthGrid = useMemo(
    () => getMonthGrid(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  // Get the date range for the visible grid (for projections)
  const gridStartDate = monthGrid[0][0];
  const gridEndDate = monthGrid[monthGrid.length - 1][6];

  // Project recurring bills for the visible range
  const projectedBills = useMemo(
    () => projectRecurringBills(bills, gridStartDate, gridEndDate),
    [bills, gridStartDate, gridEndDate]
  );

  // Combine actual and projected bills
  const allBills: (Bill | ProjectedBill)[] = useMemo(
    () => [...bills.filter((b) => !b.is_paid), ...projectedBills],
    [bills, projectedBills]
  );


  // Apply filter to bills (simplified - only 3 filters via summary cards)
  const filteredBills = useMemo(() => {
    if (activeFilter === 'all') return allBills;

    return allBills.filter((bill) => {
      const daysUntilDue = getDaysUntilDue(bill.due_date);

      switch (activeFilter) {
        case 'overdue':
          return daysUntilDue < 0;
        case 'due-soon':
          return daysUntilDue >= 0 && daysUntilDue <= 7;
        default:
          return true;
      }
    });
  }, [allBills, activeFilter]);

  // Navigation
  const goToPreviousMonth = () => {
    const { year, month } = getPreviousMonth(currentYear, currentMonth);
    setCurrentYear(year);
    setCurrentMonth(month);
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    const { year, month } = getNextMonth(currentYear, currentMonth);
    setCurrentYear(year);
    setCurrentMonth(month);
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(null);
  };

  // Navigate to a specific date's month
  const goToDate = (date: Date) => {
    setCurrentYear(date.getFullYear());
    setCurrentMonth(date.getMonth());
    setSelectedDate(date);
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Handle bill click from panel
  const handleBillClick = (bill: Bill | ProjectedBill) => {
    if ('isProjected' in bill && bill.isProjected) {
      const sourceBill = bills.find((b) => b.id === bill.sourceBillId);
      if (sourceBill) {
        onBillClick(sourceBill);
      }
    } else {
      onBillClick(bill as Bill);
    }
  };

  // Handle add bill from panel
  const handleAddBill = (date: Date) => {
    setSelectedDate(null);
    onAddBill(date);
  };

  // Handle bill drop (reschedule)
  const handleBillDrop = (billId: string, newDate: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (bill && !bill.is_paid && onReschedule) {
      onReschedule(billId, newDate, bill.due_date);
    }
  };

  // Get bills for selected date (using filtered bills)
  const selectedDateBills = selectedDate
    ? getBillsForDate(filteredBills, selectedDate)
    : [];

  const dayNames = getDayNames(true);
  const monthYearLabel = formatMonthYear(new Date(currentYear, currentMonth));

  // Get month and year separately for styling
  const [monthName, yearNum] = monthYearLabel.split(' ');

  // Calculate total bills this month
  const billsThisMonth = allBills.filter(bill => {
    const billDate = new Date(bill.due_date);
    return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
  }).length;

  // Calculate total amount due this month (unpaid only, excluding projected)
  const monthTotalAmount = useMemo(() => {
    return allBills
      .filter(bill => {
        const billDate = new Date(bill.due_date);
        const isInCurrentMonth = billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
        const isProjected = 'isProjected' in bill && bill.isProjected;
        return isInCurrentMonth && !bill.is_paid && !isProjected;
      })
      .reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }, [allBills, currentMonth, currentYear]);

  // Calculate overdue amount (unpaid only, excluding projected)
  const { overdueTotal, overdueCount } = useMemo(() => {
    let total = 0;
    let count = 0;

    allBills.forEach(bill => {
      const isProjected = 'isProjected' in bill && bill.isProjected;
      if (!isProjected && !bill.is_paid) {
        const daysUntil = getDaysUntilDue(bill.due_date);
        if (daysUntil < 0) {
          total += bill.amount || 0;
          count++;
        }
      }
    });

    return { overdueTotal: total, overdueCount: count };
  }, [allBills]);

  // Calculate total amount due in next 7 days INCLUDING today and overdue (unpaid only, excluding projected)
  // Also track the earliest due-soon bill's date for navigation
  const { upcomingTotal, upcomingCount, earliestDueSoonDate } = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const next7Days = new Date(todayStart);
    next7Days.setDate(next7Days.getDate() + 7);

    let total = 0;
    let count = 0;
    let earliestDate: Date | null = null;

    allBills.forEach(bill => {
      const billDate = new Date(bill.due_date);
      billDate.setHours(0, 0, 0, 0);
      const isProjected = 'isProjected' in bill && bill.isProjected;
      // Include overdue bills AND bills within next 7 days
      const isOverdue = billDate < todayStart;
      const isInRange = billDate >= todayStart && billDate < next7Days;

      if (!isProjected && !bill.is_paid && (isOverdue || isInRange)) {
        total += bill.amount || 0;
        count++;
        // Track the earliest date for navigation
        if (!earliestDate || billDate < earliestDate) {
          earliestDate = billDate;
        }
      }
    });

    return { upcomingTotal: total, upcomingCount: count, earliestDueSoonDate: earliestDate };
  }, [allBills]);

  // Calculate weekly totals for each week in the grid
  const weeklyTotals = useMemo(() => {
    return monthGrid.map(week => {
      const weekStart = week[0];
      const weekEnd = week[6];

      return allBills
        .filter(bill => {
          const billDate = new Date(bill.due_date);
          const isInWeek = billDate >= weekStart && billDate <= weekEnd;
          const isProjected = 'isProjected' in bill && bill.isProjected;
          return isInWeek && !bill.is_paid && !isProjected;
        })
        .reduce((sum, bill) => sum + (bill.amount || 0), 0);
    });
  }, [allBills, monthGrid]);

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full">
      {/* Calendar */}
      <div className="flex-1 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:gap-3 mb-4 sm:mb-8">
          {/* Top row: nav + month/year + actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Navigation arrows */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={goToPreviousMonth}
                  className="group relative p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
                >
                  <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="group relative p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
                >
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                </button>
              </div>

              {/* Month/Year display */}
              <div className="flex items-baseline gap-1">
                <h2 className="text-xl sm:text-3xl font-light tracking-tight text-white">
                  {monthName}
                </h2>
                <span className="text-sm sm:text-lg text-zinc-500 font-light">{yearNum}</span>
              </div>
            </div>

          {/* Summary stats - clickable to filter */}
          <div className="hidden md:flex items-center gap-3">
            {/* Overdue warning - only show if there are overdue bills */}
            {overdueCount > 0 && (
              <button
                onClick={() => setActiveFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200',
                  activeFilter === 'overdue'
                    ? 'bg-red-500/20 border-2 border-red-500/50 ring-2 ring-red-500/20'
                    : 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 hover:border-red-500/30'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/30 to-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-red-400/80 uppercase tracking-wide font-medium">Overdue</p>
                  <p className="text-sm font-bold text-red-400">
                    {formatCurrency(overdueTotal)}
                    <span className="text-[10px] font-medium text-red-400/60 ml-1">({overdueCount})</span>
                  </p>
                </div>
              </button>
            )}

            {/* Upcoming (Next 7 days + overdue) */}
            <button
              onClick={() => {
                // Toggle filter
                const newFilter = activeFilter === 'due-soon' ? 'all' : 'due-soon';
                setActiveFilter(newFilter);
                // If activating filter, navigate to the month but don't select the date
                if (newFilter === 'due-soon' && earliestDueSoonDate) {
                  setCurrentYear(earliestDueSoonDate.getFullYear());
                  setCurrentMonth(earliestDueSoonDate.getMonth());
                }
              }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200',
                activeFilter === 'due-soon'
                  ? 'bg-amber-500/15 border-2 border-amber-500/40 ring-2 ring-amber-500/20'
                  : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Due Soon</p>
                <p className="text-sm font-semibold text-white">
                  {upcomingTotal > 0 ? formatCurrency(upcomingTotal) : '$0'}
                  {upcomingCount > 0 && <span className="text-[10px] font-medium text-zinc-500 ml-1">({upcomingCount})</span>}
                </p>
              </div>
            </button>

            {/* Month total */}
            <button
              onClick={() => setActiveFilter('all')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200',
                activeFilter === 'all'
                  ? 'bg-blue-500/10 border-2 border-blue-500/30 ring-2 ring-blue-500/20'
                  : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">This Month</p>
                <p className="text-sm font-semibold text-white">
                  {monthTotalAmount > 0 ? formatCurrency(monthTotalAmount) : '$0'}
                </p>
              </div>
            </button>
          </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={goToToday}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-xl transition-all duration-300"
              >
                Today
              </button>
              <button
                onClick={() => onAddBill()}
                className="group relative flex items-center justify-center p-2.5 sm:gap-2 sm:px-5 sm:py-2.5 text-white font-medium rounded-xl overflow-hidden transition-all duration-300 hover:opacity-90"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--accent-primary) 25%, transparent)'
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Bill</span>
              </button>
            </div>
          </div>

          {/* Mobile summary stats - shown only on small screens */}
          <div className="flex md:hidden items-center gap-2">
              {/* Overdue - only show if there are overdue bills */}
              {overdueCount > 0 && (
                <button
                  onClick={() => setActiveFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-xs transition-all',
                    activeFilter === 'overdue'
                      ? 'bg-red-500/25 border border-red-500/50'
                      : 'bg-red-500/10 border border-red-500/25'
                  )}
                >
                  <span className="text-[10px] text-red-400 uppercase tracking-wide font-medium">Overdue</span>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span className="text-red-400 font-semibold">
                      {formatCurrency(overdueTotal)}
                    </span>
                    <span className="text-red-400/60 text-[10px]">({overdueCount})</span>
                  </div>
                </button>
              )}

              {/* Due Soon */}
              <button
                onClick={() => {
                  const newFilter = activeFilter === 'due-soon' ? 'all' : 'due-soon';
                  setActiveFilter(newFilter);
                  // Navigate to month but don't select the date (don't open panel)
                  if (newFilter === 'due-soon' && earliestDueSoonDate) {
                    setCurrentYear(earliestDueSoonDate.getFullYear());
                    setCurrentMonth(earliestDueSoonDate.getMonth());
                  }
                }}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-xs transition-all',
                  activeFilter === 'due-soon'
                    ? 'bg-amber-500/20 border border-amber-500/40'
                    : 'bg-white/[0.03] border border-white/[0.06]'
                )}
              >
                <span className="text-[10px] text-amber-400/80 uppercase tracking-wide">Due Soon</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className="text-zinc-200 font-semibold">
                    {formatCurrency(upcomingTotal)}
                  </span>
                  {upcomingCount > 0 && (
                    <span className="text-zinc-500 text-[10px]">({upcomingCount})</span>
                  )}
                </div>
              </button>

              {/* This Month */}
              <button
                onClick={() => setActiveFilter('all')}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-xs transition-all',
                  activeFilter === 'all'
                    ? 'bg-blue-500/20 border border-blue-500/40'
                    : 'bg-white/[0.03] border border-white/[0.06]'
                )}
              >
                <span className="text-[10px] text-blue-400/80 uppercase tracking-wide">This Month</span>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-blue-400" />
                  <span className="text-zinc-200 font-semibold">
                    {formatCurrency(monthTotalAmount)}
                  </span>
                </div>
              </button>
            </div>
        </div>

        {/* Calendar container with subtle depth */}
        <div className="relative">
          {/* Subtle glow effect behind calendar */}
          <div className="absolute -inset-1 bg-gradient-to-b from-blue-500/5 to-violet-500/5 rounded-3xl blur-xl opacity-50" />

          <div className="relative bg-[#0a0a0f]/80 backdrop-blur-xl rounded-2xl border border-white/[0.06] overflow-hidden">
            {/* Day names header */}
            <div className="grid grid-cols-7 border-b border-white/[0.04]">
              {dayNames.map((day, index) => (
                <div
                  key={day}
                  className="text-center text-[11px] font-semibold tracking-widest uppercase text-zinc-500 py-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div>
              {monthGrid.map((week, weekIndex) => (
                <div key={weekIndex}>
                  {/* Week row */}
                  <div className="grid grid-cols-7">
                    {week.map((date, dayIndex) => {
                      const billsForDay = getBillsForDate(filteredBills, date);
                      const isSelected =
                        selectedDate !== null &&
                        formatDateString(date) === formatDateString(selectedDate);
                      const dateStr = formatDateString(date);
                      const isPayday = paydayDate ? dateStr === paydayDate : false;

                      return (
                        <CalendarDay
                          key={`${weekIndex}-${dayIndex}`}
                          date={date}
                          currentMonth={currentMonth}
                          currentYear={currentYear}
                          bills={billsForDay}
                          isSelected={isSelected}
                          onClick={() => handleDayClick(date)}
                          onBillDrop={handleBillDrop}
                          animationDelay={(weekIndex * 7 + dayIndex) * 15}
                          isPayday={isPayday}
                        />
                      );
                    })}
                  </div>
                  {/* Weekly total footer - hidden on mobile */}
                  {weeklyTotals[weekIndex] > 0 && (
                    <div className="hidden sm:flex justify-end items-center gap-2 px-4 py-2 bg-gradient-to-r from-transparent via-white/[0.02] to-white/[0.03] border-b border-white/[0.04]">
                      <DollarSign className="w-3 h-3 text-zinc-600" />
                      <span className="text-[11px] font-semibold text-zinc-400">
                        {formatCurrency(weeklyTotals[weekIndex])}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Empty state overlay when no bills this month */}
          {billsThisMonth === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/60 backdrop-blur-sm rounded-2xl">
              <div className="flex flex-col items-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center mb-4 border border-white/10">
                  <Plus className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  No bills in {monthName}
                </h3>
                <p className="text-sm text-zinc-400 mb-4 max-w-xs">
                  {bills.length > 0
                    ? `You have ${bills.filter(b => !b.is_paid).length} bills in other months. Use the arrows to navigate.`
                    : 'Add your first bill to start tracking due dates and never miss a payment.'}
                </p>
                <button
                  onClick={() => onAddBill()}
                  className="flex items-center gap-2 px-5 py-2.5 text-white font-medium rounded-xl transition-all duration-300 hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--accent-primary) 25%, transparent)'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  {bills.length > 0 ? 'Add Bill' : 'Add Your First Bill'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend - uses CSS variables for custom colors */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4 sm:mt-6 px-4">
          {[
            { cssVar: '--urgency-overdue', label: 'Overdue' },
            { cssVar: '--urgency-urgent', label: 'Urgent' },
            { cssVar: '--urgency-soon', label: 'Soon' },
            { cssVar: '--urgency-safe', label: 'Safe' },
          ].map((item, index) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 sm:gap-2 animate-in fade-in duration-300"
              style={{ animationDelay: `${600 + index * 100}ms` }}
            >
              <div
                className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                style={{
                  backgroundColor: `var(${item.cssVar})`,
                  boxShadow: `0 0 8px color-mix(in srgb, var(${item.cssVar}) 50%, transparent)`,
                }}
              />
              <span className="text-[10px] sm:text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          bills={selectedDateBills}
          onClose={() => setSelectedDate(null)}
          onBillClick={handleBillClick}
          onAddBill={handleAddBill}
          onMarkPaid={onMarkPaid}
          onEdit={onEdit}
          getMutationState={getMutationState}
        />
      )}
    </div>
  );
}
