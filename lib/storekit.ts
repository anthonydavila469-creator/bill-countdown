import { Capacitor } from '@capacitor/core';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  CustomerInfo,
  PurchasesCallbackId,
  PurchasesStoreProduct,
} from '@revenuecat/purchases-capacitor';
import type {
  RevenueCatWebhookEvent,
  RevenueCatWebhookEventType,
  SubscriptionPlan,
  SubscriptionStatus,
  UserPreferences,
} from '@/types';

export const IAP_PRODUCTS = {
  MONTHLY: 'app.duezo.pro.monthly',
  YEARLY: 'app.duezo.pro.yearly',
} as const;

export type IAPProductId = (typeof IAP_PRODUCTS)[keyof typeof IAP_PRODUCTS];

export interface IAPProduct {
  productId: IAPProductId;
  title: string;
  description: string;
  price: string;
  priceRaw: number;
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

export interface RevenueCatCustomerState {
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
}

type UserSubscriptionRow = Pick<
  UserPreferences,
  | 'user_id'
  | 'stripe_customer_id'
  | 'subscription_status'
  | 'subscription_plan'
  | 'subscription_current_period_end'
  | 'subscription_cancel_at_period_end'
  | 'trial_ends_at'
  | 'is_pro'
>;

const ACTIVE_ACCESS_STATUSES = new Set<SubscriptionStatus>([
  'active',
  'trialing',
  'past_due',
  'billing_issue',
  'canceled',
]);

const NON_MUTATING_REVENUECAT_EVENTS = new Set<RevenueCatWebhookEventType>([
  'TEST',
  'INVOICE_ISSUANCE',
  'VIRTUAL_CURRENCY_TRANSACTION',
]);

const ENTITLEMENT_IDS = (
  process.env.NEXT_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID ??
  process.env.REVENUECAT_PRO_ENTITLEMENT_ID ??
  'pro'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function toIsoString(timestampMs?: number | null): string | null {
  return timestampMs ? new Date(timestampMs).toISOString() : null;
}

function hasFutureAccess(timestamp: string | null): boolean {
  return Boolean(timestamp && new Date(timestamp).getTime() > Date.now());
}

function inferPlanFromProductId(productId?: string | null): SubscriptionPlan {
  if (!productId) {
    return null;
  }

  const normalized = productId.toLowerCase();
  if (normalized.includes('year')) {
    return 'yearly';
  }
  if (normalized.includes('month')) {
    return 'monthly';
  }

  return null;
}

function pickRevenueCatEntitlement(customerInfo: CustomerInfo) {
  const activeEntitlements = customerInfo.entitlements.active;
  for (const entitlementId of ENTITLEMENT_IDS) {
    if (activeEntitlements[entitlementId]) {
      return activeEntitlements[entitlementId];
    }
  }

  const allEntitlements = customerInfo.entitlements.all;
  for (const entitlementId of ENTITLEMENT_IDS) {
    if (allEntitlements[entitlementId]) {
      return allEntitlements[entitlementId];
    }
  }

  return (
    Object.values(activeEntitlements)[0] ??
    Object.values(customerInfo.entitlements.all)[0] ??
    null
  );
}

export function deriveRevenueCatCustomerState(
  customerInfo: CustomerInfo | null | undefined
): RevenueCatCustomerState {
  if (!customerInfo) {
    return {
      isPro: false,
      subscriptionStatus: 'free',
      subscriptionPlan: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
    };
  }

  const entitlement = pickRevenueCatEntitlement(customerInfo);
  const currentPeriodEnd =
    entitlement?.expirationDate ?? customerInfo.latestExpirationDate ?? null;
  const trialEndsAt =
    entitlement?.periodType === 'TRIAL' ? entitlement.expirationDate : null;
  const billingIssueDetected = Boolean(entitlement?.billingIssueDetectedAt);
  const activeEntitlement = entitlement?.isActive ?? false;
  const futureAccess = hasFutureAccess(currentPeriodEnd);
  const isPro = activeEntitlement || futureAccess;

  let subscriptionStatus: SubscriptionStatus = 'free';
  if (billingIssueDetected) {
    subscriptionStatus = 'billing_issue';
  } else if (entitlement?.periodType === 'TRIAL' && isPro) {
    subscriptionStatus = 'trialing';
  } else if (isPro && entitlement?.willRenew === false) {
    subscriptionStatus = 'canceled';
  } else if (isPro) {
    subscriptionStatus = 'active';
  } else if (currentPeriodEnd) {
    subscriptionStatus = 'expired';
  }

  return {
    isPro,
    subscriptionStatus,
    subscriptionPlan: inferPlanFromProductId(entitlement?.productIdentifier),
    currentPeriodEnd,
    cancelAtPeriodEnd: entitlement?.willRenew === false,
    trialEndsAt,
  };
}

function deriveRevenueCatEventState(
  event: RevenueCatWebhookEvent
): RevenueCatCustomerState | null {
  const currentPeriodEnd = toIsoString(event.expiration_at_ms);
  const trialEndsAt =
    event.period_type?.toUpperCase() === 'TRIAL' ? currentPeriodEnd : null;
  const futureAccess = hasFutureAccess(currentPeriodEnd);
  const plan = inferPlanFromProductId(event.product_id);

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
    case 'NON_RENEWING_PURCHASE':
    case 'TEMPORARY_ENTITLEMENT_GRANT':
    case 'PREPAID_PURCHASE':
    case 'SUBSCRIPTION_EXTENDED':
    case 'RENEWAL_EXTENDED':
      return {
        isPro: true,
        subscriptionStatus:
          event.period_type?.toUpperCase() === 'TRIAL' ? 'trialing' : 'active',
        subscriptionPlan: plan,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        trialEndsAt,
      };
    case 'CANCELLATION':
      return {
        isPro: futureAccess,
        subscriptionStatus: futureAccess ? 'canceled' : 'expired',
        subscriptionPlan: plan,
        currentPeriodEnd,
        cancelAtPeriodEnd: futureAccess,
        trialEndsAt,
      };
    case 'BILLING_ISSUE':
      return {
        isPro: futureAccess,
        subscriptionStatus: 'billing_issue',
        subscriptionPlan: plan,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        trialEndsAt,
      };
    case 'EXPIRATION':
    case 'REFUND':
    case 'SUBSCRIPTION_PAUSED':
      return {
        isPro: false,
        subscriptionStatus: 'expired',
        subscriptionPlan: plan,
        currentPeriodEnd,
        cancelAtPeriodEnd: true,
        trialEndsAt: null,
      };
    case 'REFUND_REVERSED':
    case 'TRANSFER':
      return {
        isPro: futureAccess,
        subscriptionStatus:
          event.period_type?.toUpperCase() === 'TRIAL'
            ? 'trialing'
            : futureAccess
              ? 'active'
              : 'free',
        subscriptionPlan: plan,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        trialEndsAt,
      };
    case 'SUBSCRIBER_ALIAS':
      return null;
    default:
      return null;
  }
}

function getRevenueCatApiKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY ??
    process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ??
    null
  );
}

async function getPurchasesModule() {
  return import('@revenuecat/purchases-capacitor');
}

async function mapProducts(
  products: PurchasesStoreProduct[]
): Promise<IAPProduct[]> {
  return products
    .filter(
      (product): product is PurchasesStoreProduct & { identifier: IAPProductId } =>
        product.identifier === IAP_PRODUCTS.MONTHLY ||
        product.identifier === IAP_PRODUCTS.YEARLY
    )
    .map((product) => ({
      productId: product.identifier,
      title: product.title,
      description: product.description,
      price: product.priceString,
      priceRaw: product.price,
      currency: product.currencyCode,
      period: product.identifier === IAP_PRODUCTS.YEARLY ? 'yearly' : 'monthly',
    }));
}

function shouldPreserveStripeAccess(
  existing: UserSubscriptionRow | null,
  nextState: RevenueCatCustomerState
): boolean {
  if (!existing?.stripe_customer_id || nextState.isPro) {
    return false;
  }

  const existingHasPaidAccess =
    ACTIVE_ACCESS_STATUSES.has(existing.subscription_status) &&
    (existing.subscription_status !== 'canceled' ||
      hasFutureAccess(existing.subscription_current_period_end));

  return existingHasPaidAccess;
}

async function writeSubscriptionState(
  userIds: string[],
  nextState: RevenueCatCustomerState,
  sourceEventType: RevenueCatWebhookEventType
) {
  if (userIds.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  const uniqueUserIds = Array.from(new Set(userIds));
  const { data: existingRows } = await supabase
    .from('user_preferences')
    .select(
      'user_id, stripe_customer_id, subscription_status, subscription_plan, subscription_current_period_end, subscription_cancel_at_period_end, trial_ends_at, is_pro'
    )
    .in('user_id', uniqueUserIds);

  const existingByUserId = new Map<string, UserSubscriptionRow>(
    ((existingRows as UserSubscriptionRow[] | null) ?? []).map((row) => [row.user_id, row])
  );

  for (const userId of uniqueUserIds) {
    const existing = existingByUserId.get(userId) ?? null;
    const lockedAccess =
      existing?.subscription_current_period_end &&
      new Date(existing.subscription_current_period_end).getFullYear() >= 2090;

    if (lockedAccess || shouldPreserveStripeAccess(existing, nextState)) {
      continue;
    }

    await supabase.from('user_preferences').upsert(
      {
        user_id: userId,
        is_pro: nextState.isPro,
        subscription_status: nextState.subscriptionStatus,
        subscription_plan: nextState.subscriptionPlan,
        subscription_current_period_end: nextState.currentPeriodEnd,
        subscription_cancel_at_period_end: nextState.cancelAtPeriodEnd,
        trial_ends_at: nextState.trialEndsAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  }

  console.log(
    `[RevenueCat] Applied ${sourceEventType} to ${uniqueUserIds.length} user(s)`
  );
}

async function mirrorCanonicalStateToAliases(event: RevenueCatWebhookEvent) {
  const aliasIds = Array.from(
    new Set([event.app_user_id, ...(event.aliases ?? [])].filter(Boolean))
  );

  if (aliasIds.length < 2) {
    return;
  }

  const supabase = createAdminClient();
  const { data: canonical } = await supabase
    .from('user_preferences')
    .select(
      'user_id, stripe_customer_id, subscription_status, subscription_plan, subscription_current_period_end, subscription_cancel_at_period_end, trial_ends_at, is_pro'
    )
    .eq('user_id', event.app_user_id)
    .single();

  const derivedState = deriveRevenueCatEventState(event);
  const nextState = canonical
    ? {
        isPro: canonical.is_pro,
        subscriptionStatus: canonical.subscription_status,
        subscriptionPlan: canonical.subscription_plan,
        currentPeriodEnd: canonical.subscription_current_period_end,
        cancelAtPeriodEnd: canonical.subscription_cancel_at_period_end,
        trialEndsAt: canonical.trial_ends_at,
      }
    : derivedState;

  if (!nextState) {
    return;
  }

  await writeSubscriptionState(aliasIds, nextState, event.type);
}

export async function applyRevenueCatWebhookEvent(
  event: RevenueCatWebhookEvent
): Promise<{ handled: boolean; reason?: string }> {
  if (NON_MUTATING_REVENUECAT_EVENTS.has(event.type)) {
    return { handled: false, reason: 'non-mutating-event' };
  }

  if (event.type === 'SUBSCRIBER_ALIAS') {
    await mirrorCanonicalStateToAliases(event);
    return { handled: true };
  }

  if (event.type === 'TRANSFER') {
    const nextState = deriveRevenueCatEventState(event);
    if (nextState && event.transferred_to?.length) {
      await writeSubscriptionState(event.transferred_to, nextState, event.type);
    }

    if (event.transferred_from?.length) {
      await writeSubscriptionState(
        event.transferred_from,
        {
          isPro: false,
          subscriptionStatus: 'expired',
          subscriptionPlan: inferPlanFromProductId(event.product_id),
          currentPeriodEnd: toIsoString(event.expiration_at_ms),
          cancelAtPeriodEnd: true,
          trialEndsAt: null,
        },
        event.type
      );
    }

    return { handled: true };
  }

  const nextState = deriveRevenueCatEventState(event);
  if (!nextState) {
    return { handled: false, reason: 'unsupported-event' };
  }

  const userIds = Array.from(
    new Set(
      [
        event.app_user_id,
        event.original_app_user_id,
        ...(event.aliases ?? []),
      ].filter(Boolean) as string[]
    )
  );

  await writeSubscriptionState(userIds, nextState, event.type);
  return { handled: true };
}

class StoreKitService {
  private configuredUserId: string | null = null;

  get isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  async configure(appUserId: string): Promise<boolean> {
    if (!this.isAvailable || !appUserId) {
      return false;
    }

    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      console.warn('[StoreKit] Missing RevenueCat API key');
      return false;
    }

    const { Purchases } = await getPurchasesModule();

    if (!this.configuredUserId) {
      await Purchases.configure({
        apiKey,
        appUserID: appUserId,
      });
      this.configuredUserId = appUserId;
      return true;
    }

    if (this.configuredUserId !== appUserId) {
      await Purchases.logIn({ appUserID: appUserId });
      this.configuredUserId = appUserId;
    }

    return true;
  }

  async getCustomerState(appUserId: string): Promise<RevenueCatCustomerState | null> {
    const configured = await this.configure(appUserId);
    if (!configured) {
      return null;
    }

    const { Purchases } = await getPurchasesModule();
    const { customerInfo } = await Purchases.getCustomerInfo();
    return deriveRevenueCatCustomerState(customerInfo);
  }

  async addCustomerInfoUpdateListener(
    appUserId: string,
    listener: (state: RevenueCatCustomerState) => void
  ): Promise<PurchasesCallbackId | null> {
    const configured = await this.configure(appUserId);
    if (!configured) {
      return null;
    }

    const { Purchases } = await getPurchasesModule();
    return Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      listener(deriveRevenueCatCustomerState(customerInfo));
    });
  }

  async removeCustomerInfoUpdateListener(
    listenerId: PurchasesCallbackId | null
  ): Promise<void> {
    if (!listenerId || !this.isAvailable) {
      return;
    }

    const { Purchases } = await getPurchasesModule();
    await Purchases.removeCustomerInfoUpdateListener({
      listenerToRemove: listenerId,
    });
  }

  async fetchProducts(): Promise<IAPProduct[]> {
    if (!this.isAvailable) {
      return [];
    }

    try {
      const { Purchases } = await getPurchasesModule();
      const { products } = await Purchases.getProducts({
        productIdentifiers: Object.values(IAP_PRODUCTS),
      });
      return mapProducts(products);
    } catch (error) {
      console.error('[StoreKit] fetchProducts() error:', error);
      return [];
    }
  }

  async purchaseProduct(productId: IAPProductId): Promise<IAPPurchaseResult> {
    if (!this.isAvailable) {
      return { success: false, error: 'StoreKit not available on this platform' };
    }

    try {
      const { Purchases } = await getPurchasesModule();
      const { products } = await Purchases.getProducts({
        productIdentifiers: [productId],
      });
      const product = products.find((item) => item.identifier === productId);

      if (!product) {
        return { success: false, error: 'Product not found in RevenueCat' };
      }

      const result = await Purchases.purchaseStoreProduct({ product });
      return {
        success: true,
        transactionId: result.transaction.transactionIdentifier,
        productId,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('cancel')) {
        return { success: false, error: 'Purchase cancelled by user' };
      }

      console.error('[StoreKit] purchaseProduct() error:', error);
      return { success: false, error: message };
    }
  }

  async restorePurchases(): Promise<IAPRestoreResult> {
    if (!this.isAvailable) {
      return {
        success: false,
        restoredProductIds: [],
        error: 'StoreKit not available on this platform',
      };
    }

    try {
      const { Purchases } = await getPurchasesModule();
      const { customerInfo } = await Purchases.restorePurchases();
      const activeProductIds = customerInfo.activeSubscriptions.filter(
        (productId): productId is IAPProductId =>
          productId === IAP_PRODUCTS.MONTHLY || productId === IAP_PRODUCTS.YEARLY
      );

      return {
        success: true,
        restoredProductIds: activeProductIds,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[StoreKit] restorePurchases() error:', error);
      return { success: false, restoredProductIds: [], error: message };
    }
  }
}

export const storeKitService = new StoreKitService();
