/**
 * StoreKit IAP Service — Scaffolding for iOS In-App Purchases
 *
 * TODO: Install @capawesome-team/capacitor-purchases or similar StoreKit plugin
 *       e.g. `npm install @capawesome-team/capacitor-purchases && npx cap sync`
 * TODO: Create products in App Store Connect matching the product IDs below
 * TODO: Add server-side receipt validation endpoint (e.g. /api/iap/validate)
 */

import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Product definitions
// ---------------------------------------------------------------------------

export const IAP_PRODUCTS = {
  MONTHLY: 'app.duezo.pro.monthly',   // $4.99/month
  YEARLY: 'app.duezo.pro.yearly',     // $39.99/year
} as const;

export type IAPProductId = (typeof IAP_PRODUCTS)[keyof typeof IAP_PRODUCTS];

export interface IAPProduct {
  productId: IAPProductId;
  title: string;
  description: string;
  price: string;        // formatted, e.g. "$4.99"
  priceRaw: number;     // numeric, e.g. 4.99
  currency: string;
  period: 'monthly' | 'yearly';
}

export interface IAPPurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: IAPProductId;
  receipt?: string;
  error?: string;
}

export interface IAPRestoreResult {
  success: boolean;
  restoredProductIds: IAPProductId[];
  error?: string;
}

// ---------------------------------------------------------------------------
// StoreKit Service
// ---------------------------------------------------------------------------

class StoreKitService {
  /**
   * Returns true only when running inside the native iOS Capacitor shell.
   * On web / Android / SSR this is always false.
   */
  get isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Fetch available products from the App Store.
   * Falls back gracefully on web — returns an empty array.
   *
   * @returns Array of IAPProduct or empty array when not on iOS.
   */
  async fetchProducts(): Promise<IAPProduct[]> {
    if (!this.isAvailable) {
      // Web fallback — Stripe handles subscriptions on web
      return [];
    }

    try {
      // TODO: Replace with actual plugin call once installed, e.g.:
      // const { Purchases } = await import('@capawesome-team/capacitor-purchases');
      // const { products } = await Purchases.getProducts({
      //   productIdentifiers: Object.values(IAP_PRODUCTS),
      // });
      // return products.map(mapPluginProduct);

      // Scaffold stub — returns empty until plugin is installed
      console.warn('[StoreKit] Plugin not installed — fetchProducts() returning empty');
      return [];
    } catch (err) {
      console.error('[StoreKit] fetchProducts() error:', err);
      return [];
    }
  }

  /**
   * Initiate a purchase for a given product ID.
   * No-ops gracefully on web.
   *
   * @param productId - One of IAP_PRODUCTS.MONTHLY or IAP_PRODUCTS.YEARLY
   */
  async purchaseProduct(productId: IAPProductId): Promise<IAPPurchaseResult> {
    if (!this.isAvailable) {
      return { success: false, error: 'StoreKit not available on this platform' };
    }

    try {
      // TODO: Replace with actual plugin call once installed, e.g.:
      // const { Purchases } = await import('@capawesome-team/capacitor-purchases');
      // const result = await Purchases.purchaseProduct({ productIdentifier: productId });
      // return { success: true, transactionId: result.transactionId, productId, receipt: result.receipt };

      console.warn('[StoreKit] Plugin not installed — purchaseProduct() is a no-op');
      return { success: false, error: 'StoreKit plugin not yet installed' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Don't treat user-cancelled as an error
      if (message.includes('cancelled') || message.includes('cancel')) {
        return { success: false, error: 'Purchase cancelled by user' };
      }
      console.error('[StoreKit] purchaseProduct() error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Restore previously completed purchases.
   * No-ops gracefully on web.
   */
  async restorePurchases(): Promise<IAPRestoreResult> {
    if (!this.isAvailable) {
      return { success: false, restoredProductIds: [], error: 'StoreKit not available on this platform' };
    }

    try {
      // TODO: Replace with actual plugin call once installed, e.g.:
      // const { Purchases } = await import('@capawesome-team/capacitor-purchases');
      // const { purchases } = await Purchases.restorePurchases();
      // const ids = purchases.map(p => p.productIdentifier as IAPProductId);
      // return { success: true, restoredProductIds: ids };

      console.warn('[StoreKit] Plugin not installed — restorePurchases() is a no-op');
      return { success: false, restoredProductIds: [], error: 'StoreKit plugin not yet installed' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[StoreKit] restorePurchases() error:', err);
      return { success: false, restoredProductIds: [], error: message };
    }
  }
}

// Singleton export
export const storeKitService = new StoreKitService();
