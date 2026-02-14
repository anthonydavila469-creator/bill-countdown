import { Capacitor } from '@capacitor/core';
import DuezoWidgetBridge, { WidgetPayloadV1 } from './widget-bridge';

function getDaysLeft(dueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getUrgency(daysLeft: number): 'critical' | 'soon' | 'later' {
  if (daysLeft <= 2) return 'critical';
  if (daysLeft <= 7) return 'soon';
  return 'later';
}

/**
 * Build and sync the v1 widget payload to the native widget extension.
 * Call this whenever bills change, theme changes, or user logs in.
 */
export async function syncWidgetPayload(
  bills: any[],
  theme: string = 'emerald',
  lastMonthTotal: number | null = null
) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    console.log('[Duezo] syncWidgetPayload theme:', theme, 'bills:', bills.length);
    // Filter to unpaid bills, sorted by due date ascending
    const unpaid = bills
      .filter((b) => !b.is_paid)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    const totalDue = unpaid.reduce((sum, b) => sum + (b.amount || 0), 0);
    const deltaVsLastMonth = lastMonthTotal !== null ? totalDue - lastMonthTotal : null;

    const nextBill = unpaid.length > 0
      ? {
          id: unpaid[0].id,
          vendor: unpaid[0].name,
          amount: unpaid[0].amount,
          dueDate: unpaid[0].due_date,
          daysLeft: getDaysLeft(unpaid[0].due_date),
          isAutopay: unpaid[0].is_autopay ?? false,
          iconKey: null,
        }
      : null;

    const upcoming = unpaid.slice(0, 6).map((b) => {
      const daysLeft = getDaysLeft(b.due_date);
      return {
        id: b.id,
        vendor: b.name,
        amount: b.amount,
        dueDate: b.due_date,
        daysLeft,
        urgency: getUrgency(daysLeft),
      };
    });

    const payload: WidgetPayloadV1 = {
      version: 1,
      generatedAt: Math.floor(Date.now() / 1000),
      currencyCode: 'USD',
      totals: {
        totalDue: Math.round(totalDue * 100) / 100,
        deltaVsLastMonth: deltaVsLastMonth !== null ? Math.round(deltaVsLastMonth * 100) / 100 : null,
      },
      nextBill,
      upcoming,
    };

    await DuezoWidgetBridge.syncPayload({
      payload: JSON.stringify(payload),
      theme,
    });
  } catch (e) {
    console.warn('[Duezo] Widget payload sync failed:', e);
  }
}

/**
 * Legacy sync — kept for backward compatibility.
 */
export async function syncBillsToWidget(bills: any[]) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const widgetBills = bills.map((bill) => ({
      id: bill.id,
      name: bill.name,
      amount: bill.amount,
      due_date: bill.due_date,
      is_paid: bill.is_paid,
      category: bill.category ?? null,
    }));
    await DuezoWidgetBridge.syncBills({ bills: widgetBills });
  } catch (e) {
    console.warn('[Duezo] Widget sync failed:', e);
  }
}

export async function clearWidgetBills() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await DuezoWidgetBridge.clearBills();
  } catch (e) {
    console.warn('[Duezo] Widget clear failed:', e);
  }
}
