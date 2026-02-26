'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  storeKitService,
  type IAPProduct,
  type IAPProductId,
  type IAPPurchaseResult,
  type IAPRestoreResult,
} from '@/lib/storekit';

interface UseStoreKitReturn {
  /** Available IAP products fetched from the App Store. Empty on web — Stripe handles it there. */
  products: IAPProduct[];
  /** Whether StoreKit is available on this platform (iOS native only). */
  isAvailable: boolean;
  /** Whether products are currently loading or a purchase/restore is in progress. */
  isLoading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Initiate a purchase for the given product ID. */
  purchase: (productId: IAPProductId) => Promise<IAPPurchaseResult>;
  /** Restore previously completed purchases. */
  restore: () => Promise<IAPRestoreResult>;
  /** Re-fetch products from the App Store. */
  refetch: () => Promise<void>;
}

export function useStoreKit(): UseStoreKitReturn {
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    // On web, StoreKit is unavailable — skip silently (Stripe handles web payments)
    if (!storeKitService.isAvailable) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetched = await storeKitService.fetchProducts();
      setProducts(fetched);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load products';
      setError(message);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch products on mount (only runs on iOS)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const purchase = useCallback(async (productId: IAPProductId): Promise<IAPPurchaseResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await storeKitService.purchaseProduct(productId);
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restore = useCallback(async (): Promise<IAPRestoreResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await storeKitService.restorePurchases();
      if (!result.success && result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Restore failed';
      setError(message);
      return { success: false, restoredProductIds: [], error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    products,
    isAvailable: storeKitService.isAvailable,
    isLoading,
    error,
    purchase,
    restore,
    refetch: fetchProducts,
  };
}
