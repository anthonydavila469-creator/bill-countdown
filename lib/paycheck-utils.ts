import type { Bill, PaycheckSettings, PaycheckSummary, PaycheckRiskLevel, PaySchedule } from '@/types';

/**
 * Parse a YYYY-MM-DD date string into a Date object (in local timezone)
 */
function parseYmd(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date object as YYYY-MM-DD
 */
function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
function todayYmd(): string {
  return toYmd(new Date());
}

/**
 * Add days to a date string
 */
function addDays(ymd: string, days: number): string {
  const date = parseYmd(ymd);
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

/**
 * Add months to a date string
 */
function addMonths(ymd: string, months: number): string {
  const date = parseYmd(ymd);
  date.setMonth(date.getMonth() + months);
  return toYmd(date);
}

/**
 * Calculate the next payday based on settings.
 * If the next_payday has passed, automatically roll forward to the next occurrence.
 */
export function calculateNextPayday(settings: PaycheckSettings): string {
  const today = todayYmd();
  let nextPayday = settings.next_payday;

  if (!nextPayday) {
    return today;
  }

  // Auto-roll forward if payday has passed
  while (parseYmd(nextPayday) < parseYmd(today)) {
    nextPayday = calculateFollowingPayday(nextPayday, settings.schedule);
  }

  return nextPayday;
}

/**
 * Calculate the payday after a given date based on schedule.
 */
export function calculateFollowingPayday(date: string, schedule: PaySchedule): string {
  switch (schedule) {
    case 'weekly':
      return addDays(date, 7);
    case 'biweekly':
      return addDays(date, 14);
    case 'monthly':
      return addMonths(date, 1);
    default:
      return addDays(date, 14); // Default to biweekly
  }
}

/**
 * Check if a bill's due date is before the next payday.
 */
export function isBillBeforePayday(dueDate: string, nextPayday: string): boolean {
  return parseYmd(dueDate) < parseYmd(nextPayday);
}

/**
 * Calculate risk level based on money remaining.
 */
function calculateRiskLevel(moneyLeft: number, paycheckAmount: number): PaycheckRiskLevel {
  if (moneyLeft < 0) return 'short';
  const percentRemaining = (moneyLeft / paycheckAmount) * 100;
  if (percentRemaining >= 25) return 'safe';
  return 'tight';
}

/**
 * Calculate the full paycheck summary.
 */
export function calculatePaycheckSummary(
  bills: Bill[],
  settings: PaycheckSettings
): PaycheckSummary {
  const nextPayday = calculateNextPayday(settings);

  // Filter out paid bills
  const unpaidBills = bills.filter((bill) => !bill.is_paid);

  // Separate bills into before/after payday
  const billsBeforePaydayList = unpaidBills.filter((bill) =>
    isBillBeforePayday(bill.due_date, nextPayday)
  );
  const billsAfterPaydayList = unpaidBills.filter(
    (bill) => !isBillBeforePayday(bill.due_date, nextPayday)
  );

  // Calculate totals (treat null amounts as $0)
  const totalBeforePayday = billsBeforePaydayList.reduce(
    (sum, bill) => sum + (bill.amount ?? 0),
    0
  );
  const totalAfterPayday = billsAfterPaydayList.reduce(
    (sum, bill) => sum + (bill.amount ?? 0),
    0
  );

  // Calculate money left and risk level (only if amount is set)
  let moneyLeft: number | null = null;
  let riskLevel: PaycheckRiskLevel | null = null;

  if (settings.amount !== null && settings.amount > 0) {
    moneyLeft = settings.amount - totalBeforePayday;
    riskLevel = calculateRiskLevel(moneyLeft, settings.amount);
  }

  return {
    nextPayday,
    billsBeforePayday: billsBeforePaydayList.length,
    billsAfterPayday: billsAfterPaydayList.length,
    totalBeforePayday,
    totalAfterPayday,
    moneyLeft,
    riskLevel,
  };
}

/**
 * Format a payday date as "Jan 23" style.
 */
export function formatPayday(ymd: string): string {
  const date = parseYmd(ymd);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

/**
 * Group bills into before/after payday arrays.
 */
export function groupBillsByPayday(
  bills: Bill[],
  settings: PaycheckSettings
): { beforePayday: Bill[]; afterPayday: Bill[] } {
  const nextPayday = calculateNextPayday(settings);

  const beforePayday = bills.filter(
    (bill) => !bill.is_paid && isBillBeforePayday(bill.due_date, nextPayday)
  );
  const afterPayday = bills.filter(
    (bill) => !bill.is_paid && !isBillBeforePayday(bill.due_date, nextPayday)
  );

  // Sort both arrays by due date
  beforePayday.sort((a, b) => parseYmd(a.due_date).getTime() - parseYmd(b.due_date).getTime());
  afterPayday.sort((a, b) => parseYmd(a.due_date).getTime() - parseYmd(b.due_date).getTime());

  return { beforePayday, afterPayday };
}
