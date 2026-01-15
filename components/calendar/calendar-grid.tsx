'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
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
}

export function CalendarGrid({ bills, onBillClick, onAddBill }: CalendarGridProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  // Get bills for selected date
  const selectedDateBills = selectedDate
    ? getBillsForDate(allBills, selectedDate)
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

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full">
      {/* Calendar */}
      <div className="flex-1 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {/* Navigation arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousMonth}
                className="group relative p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              </button>
              <button
                onClick={goToNextMonth}
                className="group relative p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
              >
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Month/Year display */}
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-light tracking-tight text-white">
                {monthName}
              </h2>
              <span className="text-lg text-zinc-500 font-light">{yearNum}</span>
            </div>

            {/* Bills count badge */}
            {billsThisMonth > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 border border-blue-500/20">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span className="text-xs font-medium text-blue-300">{billsThisMonth} bills</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 rounded-xl transition-all duration-300"
            >
              Today
            </button>
            <button
              onClick={() => onAddBill()}
              className="group relative flex items-center gap-2 px-5 py-2.5 text-white font-medium rounded-xl overflow-hidden transition-all duration-300 hover:opacity-90"
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
            <div className="grid grid-cols-7">
              {monthGrid.map((week, weekIndex) =>
                week.map((date, dayIndex) => {
                  const billsForDay = getBillsForDate(allBills, date);
                  const isSelected =
                    selectedDate !== null &&
                    formatDateString(date) === formatDateString(selectedDate);

                  return (
                    <CalendarDay
                      key={`${weekIndex}-${dayIndex}`}
                      date={date}
                      currentMonth={currentMonth}
                      currentYear={currentYear}
                      bills={billsForDay}
                      isSelected={isSelected}
                      onClick={() => handleDayClick(date)}
                      animationDelay={(weekIndex * 7 + dayIndex) * 15}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Legend - uses CSS variables for custom colors */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-6 px-4">
          {[
            { cssVar: '--urgency-overdue', label: 'Overdue' },
            { cssVar: '--urgency-urgent', label: 'Urgent' },
            { cssVar: '--urgency-soon', label: 'Soon' },
            { cssVar: '--urgency-safe', label: 'Safe' },
            { cssVar: '--urgency-distant', label: 'Distant' },
            { cssVar: null, label: 'Projected', isProjected: true },
          ].map((item, index) => (
            <div
              key={item.label}
              className="flex items-center gap-2 animate-in fade-in duration-300"
              style={{ animationDelay: `${600 + index * 100}ms` }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: item.cssVar ? `var(${item.cssVar})` : '#71717a',
                  boxShadow: item.cssVar ? `0 0 8px color-mix(in srgb, var(${item.cssVar}) 50%, transparent)` : 'none',
                  opacity: item.isProjected ? 0.5 : 1,
                }}
              />
              <span className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
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
        />
      )}
    </div>
  );
}
