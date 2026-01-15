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

// Format date for input fields (YYYY-MM-DD)
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get next due date for recurring bills
export function getNextDueDate(
  currentDueDate: string,
  interval: RecurrenceInterval
): string {
  const date = new Date(currentDueDate);

  switch (interval) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return formatDateForInput(date);
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
