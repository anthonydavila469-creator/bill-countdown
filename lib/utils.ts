import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BillUrgency, RecurrenceInterval, PriceChange } from '@/types';

// Tailwind class merge utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate days until due date
export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();

  // Reset time to midnight for accurate day calculation
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

// Get urgency level based on days left
export function getUrgency(daysLeft: number): BillUrgency {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 3) return 'urgent';
  if (daysLeft <= 7) return 'soon';
  if (daysLeft <= 30) return 'safe';
  return 'distant';
}

// Format countdown text
export function formatCountdown(daysLeft: number): string {
  if (daysLeft < 0) {
    const overdue = Math.abs(daysLeft);
    return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`;
  }
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return '1 day left';
  return `${daysLeft} days left`;
}

// Format currency
export function formatCurrency(amount: number | null): string {
  if (amount === null) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date for display
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format date for compact display (no year if current year, no weekday)
export function formatDateCompact(dateString: string): string {
  const date = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const dateYear = date.getFullYear();
  
  if (dateYear === currentYear) {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  }
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format date for input fields (YYYY-MM-DD)
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get next due date for recurring bills with advanced scheduling options
export function getNextDueDate(
  currentDueDate: string,
  interval: RecurrenceInterval,
  options?: {
    dayOfMonth?: number | null; // 1-31 for monthly bills
    weekday?: number | null; // 0-6 (Sunday-Saturday) for weekly/biweekly
  }
): string {
  const date = new Date(currentDueDate + 'T12:00:00'); // Use noon to avoid timezone issues
  const { dayOfMonth, weekday } = options || {};

  switch (interval) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      // Adjust to specific weekday if provided
      if (weekday !== null && weekday !== undefined) {
        const currentDay = date.getDay();
        const diff = weekday - currentDay;
        if (diff !== 0) {
          date.setDate(date.getDate() + diff);
        }
      }
      break;

    case 'biweekly':
      date.setDate(date.getDate() + 14);
      // Adjust to specific weekday if provided
      if (weekday !== null && weekday !== undefined) {
        const currentDay = date.getDay();
        const diff = weekday - currentDay;
        if (diff !== 0) {
          date.setDate(date.getDate() + diff);
        }
      }
      break;

    case 'monthly':
      // Move to next month first
      const targetMonth = date.getMonth() + 1;
      const targetYear = date.getFullYear() + (targetMonth > 11 ? 1 : 0);
      const actualMonth = targetMonth % 12;

      // Determine target day (use dayOfMonth if provided, otherwise use current day)
      const targetDay = dayOfMonth ?? date.getDate();

      // Get the last day of the target month
      const lastDayOfMonth = new Date(targetYear, actualMonth + 1, 0).getDate();

      // Clamp to last day of month if needed
      const clampedDay = Math.min(targetDay, lastDayOfMonth);

      date.setFullYear(targetYear);
      date.setMonth(actualMonth);
      date.setDate(clampedDay);
      break;

    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      // Handle Feb 29 -> Feb 28 for non-leap years
      const originalMonth = new Date(currentDueDate).getMonth();
      const originalDay = dayOfMonth ?? new Date(currentDueDate).getDate();
      const yearLastDay = new Date(date.getFullYear(), originalMonth + 1, 0).getDate();
      date.setMonth(originalMonth);
      date.setDate(Math.min(originalDay, yearLastDay));
      break;
  }

  return formatDateForInput(date);
}

// Get the display label for a recurrence interval
export function getRecurrenceLabel(interval: RecurrenceInterval): string {
  const labels: Record<RecurrenceInterval, string> = {
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  return labels[interval];
}

// Get short label for badges
export function getRecurrenceShortLabel(interval: RecurrenceInterval): string {
  const labels: Record<RecurrenceInterval, string> = {
    weekly: 'Weekly',
    biweekly: 'Biweekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  return labels[interval];
}

// Get day of week name
export function getWeekdayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || '';
}

// Get day of week short name
export function getWeekdayShortName(day: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day] || '';
}

// Format next due date for display
export function formatNextDueDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Calculate price change between current and previous amount
export function getPriceChange(
  currentAmount: number | null,
  previousAmount: number | null
): PriceChange | null {
  // Need both amounts to calculate change
  if (currentAmount === null || previousAmount === null) return null;

  // Previous amount must be greater than 0 to avoid division by zero
  if (previousAmount <= 0) return null;

  // Current amount must be valid
  if (currentAmount < 0) return null;

  // No change if amounts are equal
  if (currentAmount === previousAmount) return null;

  const difference = currentAmount - previousAmount;
  const percentage = (difference / previousAmount) * 100;

  // Safety check for NaN/Infinity
  if (!isFinite(percentage)) return null;

  return {
    amount: Math.abs(difference),
    percentage: Math.abs(percentage),
    isIncrease: difference > 0,
  };
}
