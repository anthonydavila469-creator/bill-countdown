import { Bill, PaycheckSettings } from '@/types';

export interface BillCluster {
  bills: Bill[];
  totalAmount: number;
  startDate: Date;
  endDate: Date;
  dateRange: string;
}

/**
 * Detect clusters of bills within a 7-day window
 * Triggers when either:
 * 1. 3+ unpaid bills within 7 days
 * 2. Total amount exceeds 25% of paycheck (or $500 flat threshold if no paycheck set)
 */
export function detectBillCluster(
  bills: Bill[],
  paycheckSettings?: PaycheckSettings | null
): BillCluster | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Filter to upcoming unpaid bills (not overdue)
  const upcomingBills = bills.filter(bill => {
    if (bill.is_paid) return false;
    const dueDate = new Date(bill.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= now;
  });

  if (upcomingBills.length === 0) return null;

  // Sort by due date
  const sortedBills = [...upcomingBills].sort((a, b) => {
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  // Calculate threshold
  const amountThreshold = paycheckSettings?.amount
    ? paycheckSettings.amount * 0.25
    : 500;

  // Sliding window to find clusters
  let bestCluster: BillCluster | null = null;

  for (let i = 0; i < sortedBills.length; i++) {
    const windowStart = new Date(sortedBills[i].due_date);
    windowStart.setHours(0, 0, 0, 0);

    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 7);

    // Collect bills within this 7-day window
    const clusterBills: Bill[] = [];
    let totalAmount = 0;

    for (let j = i; j < sortedBills.length; j++) {
      const billDate = new Date(sortedBills[j].due_date);
      billDate.setHours(0, 0, 0, 0);

      if (billDate < windowEnd) {
        clusterBills.push(sortedBills[j]);
        totalAmount += sortedBills[j].amount || 0;
      } else {
        break;
      }
    }

    // Check if cluster meets trigger conditions
    const meetsCountTrigger = clusterBills.length >= 3;
    const meetsAmountTrigger = totalAmount >= amountThreshold;

    if (meetsCountTrigger || meetsAmountTrigger) {
      // Calculate actual date range of bills in cluster
      const startDate = new Date(clusterBills[0].due_date);
      const endDate = new Date(clusterBills[clusterBills.length - 1].due_date);

      // Format date range
      const dateRange = formatDateRange(startDate, endDate);

      // Return the first cluster that meets criteria (most urgent)
      return {
        bills: clusterBills,
        totalAmount,
        startDate,
        endDate,
        dateRange,
      };
    }
  }

  return null;
}

function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();

  if (start.getTime() === end.getTime()) {
    return `${startMonth} ${startDay}`;
  }

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}
