import { Capacitor } from '@capacitor/core';
import DuezoWidgetBridge, { WidgetPayloadV1 } from './widget-bridge';
import {
  buildWidgetPayload,
  normalizeBillsForWidgetSync,
  type WidgetSyncBill,
} from './sync-widget-payload';

const WIDGET_BRIDGE_NAME = 'DuezoWidgetBridge';
const WIDGET_SYNC_RETRY_MS = 350;
const WIDGET_SYNC_MAX_ATTEMPTS = 3;
export { buildWidgetPayload, normalizeBillsForWidgetSync } from './sync-widget-payload';

async function writePayloadWithRetry(payload: WidgetPayloadV1, theme: string) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= WIDGET_SYNC_MAX_ATTEMPTS; attempt += 1) {
    try {
      console.log(
        '[Duezo] Widget payload sync attempt',
        JSON.stringify({
          attempt,
          theme,
          upcomingCount: payload.upcoming.length,
          nextBillId: payload.nextBill?.id ?? null,
        })
      );
      await DuezoWidgetBridge.syncPayload({
        payload: JSON.stringify(payload),
        theme,
      });
      console.log(
        '[Duezo] Widget payload synced',
        JSON.stringify({
          attempt,
          theme,
          upcomingCount: payload.upcoming.length,
          nextBillId: payload.nextBill?.id ?? null,
        })
      );
      return;
    } catch (error) {
      lastError = error;
      console.warn(
        '[Duezo] Widget payload sync attempt failed',
        JSON.stringify({ attempt, theme, error })
      );
      if (attempt < WIDGET_SYNC_MAX_ATTEMPTS) {
        await new Promise((resolve) => globalThis.setTimeout(resolve, WIDGET_SYNC_RETRY_MS));
      }
    }
  }

  throw lastError;
}

/**
 * Build and sync the v1 widget payload to the native widget extension.
 * Call this whenever bills change, theme changes, or user logs in.
 */
export async function syncWidgetPayload(
  bills: WidgetSyncBill[],
  theme: string = 'amethyst',
  lastMonthTotal: number | null = null
) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const normalizedBills = normalizeBillsForWidgetSync(bills);
    const pluginAvailable = Capacitor.isPluginAvailable(WIDGET_BRIDGE_NAME);
    const nextBill = normalizedBills.find((bill) => !bill.is_paid) ?? null;

    console.log(
      '[Duezo] syncWidgetPayload requested',
      JSON.stringify({
        theme,
        inputBills: Array.isArray(bills) ? bills.length : 0,
        normalizedBills: normalizedBills.length,
        pluginAvailable,
        nextBillId: nextBill?.id ?? null,
      })
    );

    if (!pluginAvailable) {
      console.warn(
        '[Duezo] Widget bridge plugin not yet available, attempting anyway...',
        JSON.stringify({
          pluginName: WIDGET_BRIDGE_NAME,
          platform: Capacitor.getPlatform(),
        })
      );
      // Don't return — try anyway. The plugin may register after isPluginAvailable
      // is checked (dynamic registration in BridgeViewController.capacitorDidLoad).
    }

    const payload = buildWidgetPayload(normalizedBills, lastMonthTotal);
    console.log(
      '[Duezo] syncWidgetPayload built payload',
      JSON.stringify({
        theme,
        totalDue: payload.totals.totalDue,
        upcomingCount: payload.upcoming.length,
        nextBillId: payload.nextBill?.id ?? null,
      })
    );
    await writePayloadWithRetry(payload, theme);
  } catch (e) {
    console.warn('[Duezo] Widget payload sync failed:', e);
  }
}

/**
 * Legacy sync — kept for backward compatibility.
 */
export async function syncBillsToWidget(bills: WidgetSyncBill[]) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const normalizedBills = normalizeBillsForWidgetSync(bills);
    const widgetBills = normalizedBills.map((bill) => ({
      id: bill.id,
      name: bill.name,
      amount: typeof bill.amount === 'number' && Number.isFinite(bill.amount) ? bill.amount : 0,
      due_date: bill.due_date,
      is_paid: bill.is_paid,
      category: bill.category ?? null,
    }));
    console.log('[Duezo] syncBillsToWidget requested', JSON.stringify({ count: widgetBills.length }));
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
