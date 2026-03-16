import type { WidgetPayloadV1 } from './widget-bridge';

export interface WidgetSyncBill {
  id: string;
  name: string;
  amount: number | null;
  due_date: string;
  is_paid: boolean;
  is_autopay: boolean | null;
  category: string | null;
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toSafeAmount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function compareDueDates(a: { due_date: string }, b: { due_date: string }) {
  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
}

function getDaysLeft(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diff = due.getTime() - today.getTime();
  // Use floor so same-day = 0 (matches dashboard hero card behavior)
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getUrgency(daysLeft: number): 'critical' | 'soon' | 'later' {
  if (daysLeft <= 2) return 'critical';
  if (daysLeft <= 7) return 'soon';
  return 'later';
}

export function normalizeBillsForWidgetSync(input: unknown): WidgetSyncBill[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = input.map((bill) => {
    if (!bill || typeof bill !== 'object') {
      return null;
    }

    const raw = bill as Record<string, unknown>;
    const id = typeof raw.id === 'string' ? raw.id : null;
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : null;
    const dueDate = raw.due_date;

    if (!id || !name || !isValidDateString(dueDate)) {
      return null;
    }

    return {
      id,
      name,
      amount: typeof raw.amount === 'number' && Number.isFinite(raw.amount) ? raw.amount : null,
      due_date: dueDate,
      is_paid: Boolean(raw.is_paid),
      is_autopay: typeof raw.is_autopay === 'boolean' ? raw.is_autopay : null,
      category: typeof raw.category === 'string' ? raw.category : null,
    };
  });

  return normalized
    .filter((bill): bill is WidgetSyncBill => bill !== null)
    .sort(compareDueDates);
}

export function buildWidgetPayload(
  bills: WidgetSyncBill[],
  lastMonthTotal: number | null = null
): WidgetPayloadV1 {
  const unpaid = normalizeBillsForWidgetSync(bills).filter((bill) => !bill.is_paid);
  const totalDue = unpaid.reduce((sum, bill) => sum + toSafeAmount(bill.amount), 0);
  const deltaVsLastMonth =
    typeof lastMonthTotal === 'number' && Number.isFinite(lastMonthTotal)
      ? totalDue - lastMonthTotal
      : null;

  const nextBill = unpaid[0]
    ? {
        id: unpaid[0].id,
        vendor: unpaid[0].name,
        amount: toSafeAmount(unpaid[0].amount),
        dueDate: unpaid[0].due_date,
        daysLeft: getDaysLeft(unpaid[0].due_date),
        isAutopay: unpaid[0].is_autopay ?? false,
        iconKey: null,
      }
    : null;

  const upcoming = unpaid.slice(0, 6).map((bill) => {
    const daysLeft = getDaysLeft(bill.due_date);
    return {
      id: bill.id,
      vendor: bill.name,
      amount: toSafeAmount(bill.amount),
      dueDate: bill.due_date,
      daysLeft,
      urgency: getUrgency(daysLeft),
    };
  });

  return {
    version: 1,
    generatedAt: Math.floor(Date.now() / 1000),
    currencyCode: 'USD',
    totals: {
      totalDue: Math.round(totalDue * 100) / 100,
      deltaVsLastMonth:
        deltaVsLastMonth !== null ? Math.round(deltaVsLastMonth * 100) / 100 : null,
    },
    nextBill,
    upcoming,
  };
}
