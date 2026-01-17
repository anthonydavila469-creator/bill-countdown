import { Bill } from '@/types';
import { getDaysUntilDue } from './utils';

// Risk types for bills
export type RiskType = 'overdue' | 'urgent' | 'forgot_last_month';

export interface RiskBill {
  bill: Bill;
  riskType: RiskType;
  message: string;
  daysLeft: number;
}

/**
 * Check if a bill was paid last month but not yet this month
 * A bill is "forgot last month" if:
 * - It's recurring OR has payment history
 * - It was paid last month
 * - It's NOT paid this month yet
 * - It's due within 7 days or overdue
 */
export function isForgotLastMonth(
  bill: Bill,
  allBills: Bill[]
): boolean {
  // Must be unpaid
  if (bill.is_paid) return false;

  // Must be due within 7 days or overdue
  const daysLeft = getDaysUntilDue(bill.due_date);
  if (daysLeft > 7) return false;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  // Find paid bills with the same name from last month
  const paidLastMonth = allBills.some((b) => {
    if (!b.is_paid || !b.paid_at) return false;
    if (b.name.toLowerCase() !== bill.name.toLowerCase()) return false;

    const paidDate = new Date(b.paid_at);
    return (
      paidDate.getMonth() === lastMonth &&
      paidDate.getFullYear() === lastMonthYear
    );
  });

  // Check if already paid this month
  const paidThisMonth = allBills.some((b) => {
    if (!b.is_paid || !b.paid_at) return false;
    if (b.name.toLowerCase() !== bill.name.toLowerCase()) return false;

    const paidDate = new Date(b.paid_at);
    return (
      paidDate.getMonth() === currentMonth &&
      paidDate.getFullYear() === currentYear
    );
  });

  // It's "forgot" if it was paid last month but not this month
  // Also consider recurring bills as candidates
  return (paidLastMonth || bill.is_recurring) && !paidThisMonth;
}

/**
 * Get all bills that are at risk (overdue, urgent, or forgot last month)
 * Returns up to maxItems, prioritized by urgency
 */
export function getRiskBills(
  bills: Bill[],
  maxItems: number = 3
): RiskBill[] {
  const riskBills: RiskBill[] = [];
  const unpaidBills = bills.filter((b) => !b.is_paid);

  for (const bill of unpaidBills) {
    const daysLeft = getDaysUntilDue(bill.due_date);

    // Check for overdue (highest priority)
    if (daysLeft < 0) {
      const daysOverdue = Math.abs(daysLeft);
      riskBills.push({
        bill,
        riskType: 'overdue',
        message: `${bill.name} is ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
        daysLeft,
      });
      continue;
    }

    // Check for urgent (0-3 days)
    if (daysLeft <= 3) {
      const message =
        daysLeft === 0
          ? `${bill.name} is due today`
          : `${bill.name} due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
      riskBills.push({
        bill,
        riskType: 'urgent',
        message,
        daysLeft,
      });
      continue;
    }

    // Check for forgot last month (only if due within 7 days)
    if (daysLeft <= 7 && isForgotLastMonth(bill, bills)) {
      riskBills.push({
        bill,
        riskType: 'forgot_last_month',
        message: `You paid ${bill.name} last month — still unpaid this month`,
        daysLeft,
      });
    }
  }

  // Sort by priority: overdue first, then urgent, then forgot
  const priorityOrder: Record<RiskType, number> = {
    overdue: 0,
    urgent: 1,
    forgot_last_month: 2,
  };

  riskBills.sort((a, b) => {
    // First by risk type
    const priorityDiff = priorityOrder[a.riskType] - priorityOrder[b.riskType];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by days left (most urgent first)
    return a.daysLeft - b.daysLeft;
  });

  return riskBills.slice(0, maxItems);
}

/**
 * Check if a bill has late payment risk
 * Returns true if the bill is overdue or urgent AND is manual payment
 */
export function hasLatePaymentRisk(bill: Bill): boolean {
  if (bill.is_paid) return false;

  const daysLeft = getDaysUntilDue(bill.due_date);
  const isUrgentOrOverdue = daysLeft <= 3;
  const isManualPayment = !bill.is_autopay;

  return isUrgentOrOverdue && isManualPayment;
}

/**
 * Get the risk type for a bill
 * Returns null if the bill has no special risk status
 */
export function getBillRiskType(
  bill: Bill,
  allBills: Bill[]
): RiskType | null {
  if (bill.is_paid) return null;

  const daysLeft = getDaysUntilDue(bill.due_date);

  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 3) return 'urgent';
  if (daysLeft <= 7 && isForgotLastMonth(bill, allBills)) {
    return 'forgot_last_month';
  }

  return null;
}

/**
 * Get bills that were due in a past month but never marked paid
 * These are bills that might have been missed/forgotten entirely
 */
export function getMissedBills(bills: Bill[]): Bill[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return bills.filter((bill) => {
    if (bill.is_paid) return false;

    const dueDate = new Date(bill.due_date);
    // Bill is considered "missed" if it's more than 30 days overdue
    return dueDate < thirtyDaysAgo;
  });
}
