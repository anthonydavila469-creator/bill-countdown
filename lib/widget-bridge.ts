/**
 * Widget Bridge - Sync bills with the iOS widget
 * 
 * This communicates with the native iOS WidgetBridge plugin
 * to sync bill data to the widget's shared App Group storage.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

interface WidgetBridgePlugin {
  syncBills(options: { bills: Bill[] }): Promise<{ success: boolean; billCount: number; syncedAt: string }>;
  clearBills(): Promise<{ success: boolean }>;
  refreshWidget(): Promise<{ success: boolean }>;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category?: string | null;
  is_paid: boolean;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/**
 * Sync bills to the iOS widget
 * Call this whenever bills are loaded or updated
 */
export async function syncBillsToWidget(bills: Bill[]): Promise<boolean> {
  // Only run on native iOS
  if (Capacitor.getPlatform() !== 'ios') {
    console.log('[WidgetBridge] Not on iOS, skipping sync');
    return false;
  }

  try {
    // Filter to only unpaid bills and format for the widget
    const unpaidBills = bills
      .filter(bill => !bill.is_paid)
      .map(bill => ({
        id: bill.id,
        name: bill.name,
        amount: bill.amount,
        due_date: bill.due_date,
        category: bill.category || null,
        is_paid: bill.is_paid
      }));

    const result = await WidgetBridge.syncBills({ bills: unpaidBills });
    console.log(`[WidgetBridge] Synced ${result.billCount} bills at ${result.syncedAt}`);
    return result.success;
  } catch (error) {
    console.error('[WidgetBridge] Failed to sync bills:', error);
    return false;
  }
}

/**
 * Clear all bills from the widget (call on logout)
 */
export async function clearWidgetBills(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'ios') {
    return false;
  }

  try {
    const result = await WidgetBridge.clearBills();
    console.log('[WidgetBridge] Cleared widget bills');
    return result.success;
  } catch (error) {
    console.error('[WidgetBridge] Failed to clear bills:', error);
    return false;
  }
}

/**
 * Manually refresh the widget
 */
export async function refreshWidget(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'ios') {
    return false;
  }

  try {
    const result = await WidgetBridge.refreshWidget();
    return result.success;
  } catch (error) {
    console.error('[WidgetBridge] Failed to refresh widget:', error);
    return false;
  }
}
