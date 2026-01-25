import { Bill, BillCategory, categoryEmojis } from '@/types';

// Types for insights
export interface MonthOption {
  key: string; // "YYYY-MM" format
  label: string; // "Jan 2026" format
}

export interface CategoryBreakdownItem {
  category: BillCategory | 'other';
  emoji: string;
  label: string;
  total: number;
  percentage: number;
  count: number;
}

export interface CategoryChange {
  category: BillCategory | 'other';
  emoji: string;
  label: string;
  currentTotal: number;
  previousTotal: number;
  difference: number;
  percentageChange: number; // Percentage change from previous to current
  isIncrease: boolean;
}

export interface NewBillItem {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  paidAt: string;
}

// Category display labels
const categoryLabels: Record<BillCategory | 'other', string> = {
  utilities: 'Utilities',
  subscription: 'Subscriptions',
  rent: 'Rent',
  housing: 'Housing',
  insurance: 'Insurance',
  phone: 'Phone',
  internet: 'Internet',
  credit_card: 'Credit Card',
  loan: 'Loan',
  health: 'Health',
  other: 'Other',
};

// Get the effective amount for a bill (priority: last_paid_amount > amount > 0)
export function getBillAmount(bill: Bill): number {
  return bill.last_paid_amount ?? bill.amount ?? 0;
}

// Get month key in "YYYY-MM" format
export function getMonthKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Get human-readable month label (e.g., "Jan 2026")
export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Get the previous month key
export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month - 2 because month is 1-indexed
  return getMonthKey(date);
}

// Get current month key
export function getCurrentMonthKey(): string {
  return getMonthKey(new Date());
}

// Filter bills to only those paid in a specific month
export function getPaidBillsForMonth(bills: Bill[], monthKey: string): Bill[] {
  return bills.filter((bill) => {
    if (!bill.is_paid || !bill.paid_at) return false;
    const billMonthKey = getMonthKey(bill.paid_at);
    return billMonthKey === monthKey;
  });
}

// Get all available months that have paid bills (sorted newest first)
export function getAvailableMonths(bills: Bill[]): MonthOption[] {
  const monthSet = new Set<string>();

  bills.forEach((bill) => {
    if (bill.is_paid && bill.paid_at) {
      monthSet.add(getMonthKey(bill.paid_at));
    }
  });

  // Always include current month even if no bills
  monthSet.add(getCurrentMonthKey());

  const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

  return sortedMonths.map((key) => ({
    key,
    label: getMonthLabel(key),
  }));
}

// Calculate total amount for a set of bills
export function calculateMonthlyTotal(bills: Bill[]): number {
  return bills.reduce((sum, bill) => sum + getBillAmount(bill), 0);
}

// Calculate category breakdown with percentages
export function calculateCategoryBreakdown(bills: Bill[]): CategoryBreakdownItem[] {
  const categoryTotals = new Map<BillCategory | 'other', { total: number; count: number }>();

  bills.forEach((bill) => {
    const category = bill.category ?? 'other';
    const amount = getBillAmount(bill);
    const existing = categoryTotals.get(category) || { total: 0, count: 0 };
    categoryTotals.set(category, {
      total: existing.total + amount,
      count: existing.count + 1,
    });
  });

  const totalAmount = calculateMonthlyTotal(bills);

  const breakdown: CategoryBreakdownItem[] = [];

  categoryTotals.forEach((data, category) => {
    breakdown.push({
      category,
      emoji: category === 'other' ? '📄' : categoryEmojis[category],
      label: categoryLabels[category],
      total: data.total,
      percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0,
      count: data.count,
    });
  });

  // Sort by total (highest first)
  return breakdown.sort((a, b) => b.total - a.total);
}

// Compare category spending between two months
export function compareCategorySpending(
  currentBills: Bill[],
  previousBills: Bill[]
): { increases: CategoryChange[]; decreases: CategoryChange[] } {
  const currentBreakdown = calculateCategoryBreakdown(currentBills);
  const previousBreakdown = calculateCategoryBreakdown(previousBills);

  const previousMap = new Map(previousBreakdown.map((item) => [item.category, item.total]));

  const changes: CategoryChange[] = [];

  // Calculate changes for categories in current month
  currentBreakdown.forEach((item) => {
    const previousTotal = previousMap.get(item.category) ?? 0;
    const difference = item.total - previousTotal;

    if (difference !== 0) {
      // Calculate percentage change (handle division by zero)
      const percentageChange = previousTotal > 0
        ? ((item.total - previousTotal) / previousTotal) * 100
        : 100; // If no previous spending, treat as 100% increase

      changes.push({
        category: item.category,
        emoji: item.emoji,
        label: item.label,
        currentTotal: item.total,
        previousTotal,
        difference: Math.abs(difference),
        percentageChange: Math.abs(percentageChange),
        isIncrease: difference > 0,
      });
    }
  });

  // Check for categories that existed last month but not this month
  previousBreakdown.forEach((item) => {
    const existsInCurrent = currentBreakdown.some((c) => c.category === item.category);
    if (!existsInCurrent && item.total > 0) {
      changes.push({
        category: item.category,
        emoji: item.emoji,
        label: item.label,
        currentTotal: 0,
        previousTotal: item.total,
        difference: item.total,
        percentageChange: 100, // 100% decrease (spent nothing)
        isIncrease: false,
      });
    }
  });

  // Sort by difference amount and return ALL changes (not limited)
  const increases = changes
    .filter((c) => c.isIncrease)
    .sort((a, b) => b.difference - a.difference);

  const decreases = changes
    .filter((c) => !c.isIncrease)
    .sort((a, b) => b.difference - a.difference);

  return { increases, decreases };
}

// Get bills that were paid this month but not last month (deduplicated)
export function getNewBillsThisMonth(currentBills: Bill[], previousBills: Bill[]): NewBillItem[] {
  // Create set of identifiers from previous month
  const previousIdentifiers = new Set<string>();

  previousBills.forEach((bill) => {
    // Use normalized name as the primary identifier
    const nameKey = bill.name.toLowerCase().trim();
    previousIdentifiers.add(nameKey);

    // Also track by parent_bill_id for recurring bills
    if (bill.parent_bill_id) {
      previousIdentifiers.add(`parent:${bill.parent_bill_id}`);
    }
  });

  // Track bills we've already added to avoid duplicates within current month
  const seenInCurrentMonth = new Set<string>();
  const newBills: NewBillItem[] = [];

  currentBills.forEach((bill) => {
    const nameKey = bill.name.toLowerCase().trim();

    // Check if this bill (by name) existed in previous month
    const existedByName = previousIdentifiers.has(nameKey);

    // Check if this bill's parent existed in previous month
    const existedByParent = bill.parent_bill_id
      ? previousIdentifiers.has(`parent:${bill.parent_bill_id}`)
      : false;

    const existedBefore = existedByName || existedByParent;

    // Only add if it's new AND we haven't already added a bill with this name
    if (!existedBefore && !seenInCurrentMonth.has(nameKey)) {
      seenInCurrentMonth.add(nameKey);
      newBills.push({
        id: bill.id,
        name: bill.name,
        emoji: bill.emoji,
        amount: getBillAmount(bill),
        paidAt: bill.paid_at || '',
      });
    }
  });

  return newBills;
}

// Trend data point for historical charts
export interface MonthlyTrendPoint {
  monthKey: string; // "YYYY-MM" format
  monthLabel: string; // "Jan '26" format
  total: number;
  billCount: number;
}

// Get monthly spending trends for the last N months
export function getMonthlyTrends(bills: Bill[], months: number = 6): MonthlyTrendPoint[] {
  // Get all unique months with paid bills
  const monthTotals = new Map<string, { total: number; count: number }>();

  bills.forEach((bill) => {
    if (!bill.is_paid || !bill.paid_at) return;

    const monthKey = getMonthKey(bill.paid_at);
    const amount = getBillAmount(bill);
    const existing = monthTotals.get(monthKey) || { total: 0, count: 0 };
    monthTotals.set(monthKey, {
      total: existing.total + amount,
      count: existing.count + 1,
    });
  });

  // Sort by month key and take last N months
  const sortedMonths = Array.from(monthTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months);

  return sortedMonths.map(([monthKey, data]) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' }) + " '" + String(year).slice(-2);

    return {
      monthKey,
      monthLabel,
      total: Math.round(data.total * 100) / 100,
      billCount: data.count,
    };
  });
}

// Check if this is the first month with any paid bills
export function isFirstMonthTracked(bills: Bill[], selectedMonth: string): boolean {
  const availableMonths = getAvailableMonths(bills);
  const monthsWithBills = availableMonths.filter((m) => {
    const monthBills = getPaidBillsForMonth(bills, m.key);
    return monthBills.length > 0;
  });

  if (monthsWithBills.length === 0) return true;

  // Check if selected month is the earliest month with bills
  const sortedMonths = monthsWithBills.map((m) => m.key).sort();
  return sortedMonths[0] === selectedMonth;
}
