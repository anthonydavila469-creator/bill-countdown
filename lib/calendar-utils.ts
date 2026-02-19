import { Bill, RecurrenceInterval } from '@/types';

// Extended bill type for projected recurring bills
export interface ProjectedBill extends Bill {
  isProjected: boolean;
  sourceBillId: string;
}

/**
 * Get all days in a month as a 2D array (weeks)
 * Each week is an array of 7 Date objects
 * Days outside the month are included to fill the grid
 */
export function getMonthGrid(year: number, month: number): Date[][] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Start from the Sunday of the week containing the first day
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // End on the Saturday of the week containing the last day
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const weeks: Date[][] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

/**
 * Check if two dates are the same calendar day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is in a specific month
 */
export function isInMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Format month and year for display
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Get bills for a specific date
 */
export function getBillsForDate(
  bills: (Bill | ProjectedBill)[],
  date: Date
): (Bill | ProjectedBill)[] {
  const dateStr = formatDateString(date);
  return bills.filter((bill) => bill.due_date === dateStr);
}

/**
 * Format date as YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate next due date based on recurrence interval
 */
function getNextDueDate(currentDate: Date, interval: RecurrenceInterval): Date {
  const next = new Date(currentDate);

  switch (interval) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      // Unknown interval — advance by 30 days to prevent infinite loop
      next.setDate(next.getDate() + 30);
      break;
  }

  return next;
}

/**
 * Project recurring bills into future dates
 * Returns an array of projected bill occurrences
 */
export function projectRecurringBills(
  bills: Bill[],
  startDate: Date,
  endDate: Date
): ProjectedBill[] {
  const projectedBills: ProjectedBill[] = [];

  // Get recurring bills that are not paid
  const recurringBills = bills.filter(
    (bill) => bill.is_recurring && bill.recurrence_interval && !bill.is_paid
  );

  for (const bill of recurringBills) {
    const billDate = new Date(bill.due_date);
    let currentDate = new Date(billDate);

    // If bill is before start date, move forward until we're in range
    while (currentDate < startDate) {
      currentDate = getNextDueDate(currentDate, bill.recurrence_interval!);
    }

    // Skip the original bill date (it's not projected)
    if (isSameDay(currentDate, billDate)) {
      currentDate = getNextDueDate(currentDate, bill.recurrence_interval!);
    }

    // Generate projected occurrences until end date
    while (currentDate <= endDate) {
      projectedBills.push({
        ...bill,
        id: `${bill.id}-projected-${formatDateString(currentDate)}`,
        due_date: formatDateString(currentDate),
        isProjected: true,
        sourceBillId: bill.id,
      });

      currentDate = getNextDueDate(currentDate, bill.recurrence_interval!);
    }
  }

  return projectedBills;
}

/**
 * Get the first day of a month
 */
export function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

/**
 * Get the last day of a month
 */
export function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
}

/**
 * Navigate to next month
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
}

/**
 * Get day names for calendar header
 */
export function getDayNames(short: boolean = false): string[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return short ? days.map((d) => d.slice(0, 3)) : days;
}
