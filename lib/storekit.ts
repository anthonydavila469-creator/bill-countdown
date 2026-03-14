/**
 * StoreKit IAP Service — RevenueCat-powered iOS In-App Purchases
 *
 * Uses @revenuecat/purchases-capacitor for StoreKit 2 integration.
 * Web/Android gracefully no-op — Stripe handles web subscriptions.
 */

import { Capacitor } from '@capacitor/core';
import type { PurchasesPackage, PurchasesStoreProduct } from '@revenuecat/purchases-typescript-internal-esm';

// ---------------------------------------------------------------------------
// Product definitions
// ---------------------------------------------------------------------------

export const IAP_PRODUCTS = {
  MONTHLY: 'app.duezo.pro.monthly',   // $3.99/month
  YEARLY: 'app.duezo.pro.yearly',     // $19.99/year (7-day free trial)
} as const;

export type IAPProductId = (typeof IAP_PRODUCTS)[keyof typeof IAP_PRODUCTS];

export interface IAPProduct {
  productId: IAPProductId;
  title: string;
  description: string;
  price: string;        // formatted, e.g. "$3.99"
  priceRaw: number;     // numeric, e.g. 3.99
  currency: string;
  period: 'monthly' | 'yearly';
}

export interface IAPPurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: IAPProductId;
  error?: string;
}

export interface IAPRestoreResult {
  success: boolean;
  restoredProductIds: IAPProductId[];
  error?: string;
}

export interface RevenueCatCustomerInfo {
  isPro: boolean;
  expirationDate: string | null;
  isTrialing: boolean;
}

// ---------------------------------------------------------------------------
// StoreKit Service (RevenueCat)
// ---------------------------------------------------------------------------

class StoreKitService {
  private initialized = false;

  /**
   * Returns true only when running inside the native iOS Capacitor shell.
   */
  get isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  /**
   * Initialize RevenueCat SDK. Must be called before any purchases.
   * Safe to call multiple times — only initializes once.
   */
  async initialize(appUserId?: string): Promise<void> {
    if (!this.isAvailable || this.initialized) return;

    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const apiKey = process.env.NEXT_PUBLIC_REVENUCAT_API_KEY || 'your_revenucat_api_key_here';

      await Purchases.configure({
        apiKey,
        appUserID: appUserId ?? undefined,
      });

      this.initialized = true;
    } catch (err) {
      console.error('[RevenueCat] initialize() error:', err);
    }
  }

  /**
   * Fetch available products from RevenueCat offerings.
   * Falls back gracefully on web — returns an empty array.
   */
  async fetchProducts(): Promise<IAPProduct[]> {
    if (!this.isAvailable) return [];

    try {
      await this.initialize();
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();

      if (!offerings.current?.availablePackages?.length) {
        console.warn('[RevenueCat] No offerings/packages available');
        return [];
      }

      return offerings.current.availablePackages
        .filter((pkg: PurchasesPackage) => {
          const id = pkg.product.identifier;
          return id === IAP_PRODUCTS.MONTHLY || id === IAP_PRODUCTS.YEARLY;
        })
        .map((pkg: PurchasesPackage) => {
          const product: PurchasesStoreProduct = pkg.product;
          const productId = product.identifier as IAPProductId;
          const isMonthly = productId === IAP_PRODUCTS.MONTHLY;

          return {
            productId,
            title: product.title ?? (isMonthly ? 'Pro Monthly' : 'Pro Annual'),
            description: product.description ?? (isMonthly ? '$3.99/month' : '$19.99/year'),
            price: product.priceString ?? (isMonthly ? '$3.99' : '$19.99'),
            priceRaw: product.price,
            currency: product.currencyCode || 'USD',
            period: isMonthly ? 'monthly' : 'yearly',
          };
        });
    } catch (err) {
      console.error('[RevenueCat] fetchProducts() error:', err);
      return [];
    }
  }

  /**
   * Purchase a product by ID.
   */
  async purchaseProduct(productId: IAPProductId): Promise<IAPPurchaseResult> {
    if (!this.isAvailable) {
      return { success: false, error: 'StoreKit not available on this platform' };
    }

    try {
      await this.initialize();
      const { Purchases } = await import('@revenuecat/purchases-capacitor');

      // Get offerings to find the right package
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.find(
        (p: PurchasesPackage) => p.product.identifier === productId
      );

      if (!pkg) {
        return { success: false, error: 'Product not found in offerings' };
      }

      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

      // Check if the pro entitlement is now active
      const isPro = customerInfo.entitlements.active['pro'] !== undefined;

      return {
        success: isPro,
        productId,
        error: isPro ? undefined : 'Purchase completed but entitlement not active',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('cancelled') || message.includes('cancel') || message.includes('PURCHASE_CANCELLED')) {
        return { success: false, error: 'Purchase cancelled by user' };
      }
      console.error('[RevenueCat] purchaseProduct() error:', err);
      return { success: false, error: message };
    }
  }

  /**
   * Restore previously completed purchases.
   */
  async restorePurchases(): Promise<IAPRestoreResult> {
    if (!this.isAvailable) {
      return { success: false, restoredProductIds: [], error: 'StoreKit not available on this platform' };
    }

    try {
      await this.initialize();
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();

      const isPro = customerInfo.entitlements.active['pro'] !== undefined;
      const restoredIds: IAPProductId[] = [];

      if (isPro) {
        // Determine which product is active from the entitlement
        const proEntitlement = customerInfo.entitlements.active['pro'];
        if (proEntitlement) {
          const pid = proEntitlement.productIdentifier as IAPProductId;
          if (pid === IAP_PRODUCTS.MONTHLY || pid === IAP_PRODUCTS.YEARLY) {
            restoredIds.push(pid);
          }
        }
      }

      return { success: isPro, restoredProductIds: restoredIds };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[RevenueCat] restorePurchases() error:', err);
      return { success: false, restoredProductIds: [], error: message };
    }
  }

  /**
   * Get current customer subscription info from RevenueCat.
   */
  async getCustomerInfo(): Promise<RevenueCatCustomerInfo> {
    if (!this.isAvailable) {
      return { isPro: false, expirationDate: null, isTrialing: false };
    }

    try {
      await this.initialize();
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.getCustomerInfo();

      const proEntitlement = customerInfo.entitlements.active['pro'];
      const isPro = proEntitlement !== undefined;

      return {
        isPro,
        expirationDate: proEntitlement?.expirationDate ?? null,
        isTrialing: proEntitlement?.periodType === 'TRIAL',
      };
    } catch (err) {
      console.error('[RevenueCat] getCustomerInfo() error:', err);
      return { isPro: false, expirationDate: null, isTrialing: false };
    }
  }

  /**
   * Set the RevenueCat app user ID (call after auth).
   */
  async setAppUserId(userId: string): Promise<void> {
    if (!this.isAvailable) return;

    try {
      await this.initialize();
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      await Purchases.logIn({ appUserID: userId });
    } catch (err) {
      console.error('[RevenueCat] setAppUserId() error:', err);
    }
  }
}

// Singleton export
export const storeKitService = new StoreKitService();
