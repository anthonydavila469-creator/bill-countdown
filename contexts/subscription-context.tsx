'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { PurchasesCallbackId } from '@revenuecat/purchases-capacitor';
import { createClient } from '@/lib/supabase/client';
import {
  storeKitService,
  type RevenueCatCustomerState,
} from '@/lib/storekit';
import type { SubscriptionStatus, SubscriptionPlan, UserPreferences } from '@/types';

const FREE_BILL_LIMIT = 5;
const FREE_GMAIL_SYNCS = 1;

export interface SubscriptionState {
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  isTrialing: boolean;
  trialDaysLeft: number;
  billsUsed: number;
  gmailSyncsUsed: number;
  billLimit: number;
  canAddBill: boolean;
  gmailSyncsAllowed: number;
  canSyncGmail: boolean;
  canUseCalendar: boolean;
  canUsePaymentLinks: boolean;
  canUseHistory: boolean;
  canUseVariableBills: boolean;
  canCustomizeReminders: boolean;
  canUsePushNotifications: boolean;
  canUseDailyAutoSync: boolean;
  isLoading: boolean;
  isIosApp: boolean;
  upgradeCtasEnabled: boolean;
}

interface SubscriptionContextValue extends SubscriptionState {
  showUpgradeModal: (feature: string) => void;
  hideUpgradeModal: () => void;
  refreshSubscription: () => Promise<void>;
  incrementGmailSyncs: () => Promise<void>;
  upgradeModalOpen: boolean;
  upgradeModalFeature: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

type PreferencesSnapshot = Pick<
  UserPreferences,
  | 'is_pro'
  | 'subscription_status'
  | 'subscription_plan'
  | 'subscription_current_period_end'
  | 'subscription_cancel_at_period_end'
  | 'gmail_syncs_used'
  | 'trial_ends_at'
> | null;

function daysUntil(timestamp: string | null): number {
  if (!timestamp) {
    return 0;
  }

  const diff = new Date(timestamp).getTime() - Date.now();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

function hasFutureAccess(timestamp: string | null): boolean {
  return Boolean(timestamp && new Date(timestamp).getTime() > Date.now());
}

function mergeSubscriptionSources(
  preferences: PreferencesSnapshot,
  revenueCat: RevenueCatCustomerState | null
) {
  const stripeOrSupabaseIsPro =
    Boolean(preferences?.is_pro) ||
    (preferences?.subscription_status === 'canceled' &&
      hasFutureAccess(preferences.subscription_current_period_end)) ||
    preferences?.subscription_status === 'active' ||
    preferences?.subscription_status === 'trialing' ||
    preferences?.subscription_status === 'past_due' ||
    preferences?.subscription_status === 'billing_issue';

  const revenueCatIsPro = Boolean(revenueCat?.isPro);
  const isPro = stripeOrSupabaseIsPro || revenueCatIsPro;

  const currentPeriodEnd =
    [preferences?.subscription_current_period_end, revenueCat?.currentPeriodEnd]
      .filter(Boolean)
      .sort((left, right) => new Date(right!).getTime() - new Date(left!).getTime())[0] ??
    null;

  const statusPriority: SubscriptionStatus[] = [
    'billing_issue',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'expired',
    'free',
  ];

  const availableStatuses = [
    preferences?.subscription_status,
    revenueCat?.subscriptionStatus,
    isPro ? 'active' : 'free',
  ].filter(Boolean) as SubscriptionStatus[];

  const subscriptionStatus =
    statusPriority.find((status) => availableStatuses.includes(status)) ?? 'free';

  return {
    isPro,
    subscriptionStatus,
    subscriptionPlan:
      revenueCat?.subscriptionPlan ?? preferences?.subscription_plan ?? null,
    currentPeriodEnd,
    cancelAtPeriodEnd:
      Boolean(preferences?.subscription_cancel_at_period_end) ||
      Boolean(revenueCat?.cancelAtPeriodEnd),
    trialEndsAt: revenueCat?.trialEndsAt ?? preferences?.trial_ends_at ?? null,
    gmailSyncsUsed: preferences?.gmail_syncs_used ?? 0,
  };
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const supabaseRef = useRef(createClient());
  const listenerIdRef = useRef<PurchasesCallbackId | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionState>({
    isPro: false,
    subscriptionStatus: 'free',
    subscriptionPlan: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    isTrialing: false,
    trialDaysLeft: 0,
    billsUsed: 0,
    gmailSyncsUsed: 0,
    billLimit: FREE_BILL_LIMIT,
    canAddBill: true,
    gmailSyncsAllowed: FREE_GMAIL_SYNCS,
    canSyncGmail: true,
    canUseCalendar: false,
    canUsePaymentLinks: false,
    canUseHistory: false,
    canUseVariableBills: false,
    canCustomizeReminders: false,
    canUsePushNotifications: false,
    canUseDailyAutoSync: false,
    isLoading: true,
    isIosApp: storeKitService.isAvailable,
    upgradeCtasEnabled: true,
  });
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncSubscription = async () => {
      try {
        const supabase = supabaseRef.current;
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setSubscription((current) => ({
              ...current,
              isLoading: false,
            }));
          }
          return;
        }

        const [{ data: preferences }, { count }, revenueCat] = await Promise.all([
          supabase
            .from('user_preferences')
            .select(
              'is_pro, subscription_status, subscription_plan, subscription_current_period_end, subscription_cancel_at_period_end, gmail_syncs_used, trial_ends_at'
            )
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('bills')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          storeKitService.getCustomerState(user.id),
        ]);

        if (cancelled) {
          return;
        }

        const merged = mergeSubscriptionSources(
          (preferences as PreferencesSnapshot) ?? null,
          revenueCat
        );
        const billLimit = merged.isPro ? Number.POSITIVE_INFINITY : FREE_BILL_LIMIT;
        const gmailSyncsAllowed = merged.isPro
          ? Number.POSITIVE_INFINITY
          : FREE_GMAIL_SYNCS;
        const billsUsed = count ?? 0;

        setSubscription({
          isPro: merged.isPro,
          subscriptionStatus: merged.subscriptionStatus,
          subscriptionPlan: merged.subscriptionPlan,
          currentPeriodEnd: merged.currentPeriodEnd,
          cancelAtPeriodEnd: merged.cancelAtPeriodEnd,
          trialEndsAt: merged.trialEndsAt,
          isTrialing: merged.subscriptionStatus === 'trialing',
          trialDaysLeft: daysUntil(merged.trialEndsAt),
          billsUsed,
          gmailSyncsUsed: merged.gmailSyncsUsed,
          billLimit,
          canAddBill: merged.isPro || billsUsed < FREE_BILL_LIMIT,
          gmailSyncsAllowed,
          canSyncGmail: merged.isPro || merged.gmailSyncsUsed < FREE_GMAIL_SYNCS,
          canUseCalendar: merged.isPro,
          canUsePaymentLinks: merged.isPro,
          canUseHistory: merged.isPro,
          canUseVariableBills: merged.isPro,
          canCustomizeReminders: merged.isPro,
          canUsePushNotifications: merged.isPro,
          canUseDailyAutoSync: merged.isPro,
          isLoading: false,
          isIosApp: storeKitService.isAvailable,
          upgradeCtasEnabled: !merged.isPro,
        });

        if (listenerIdRef.current) {
          await storeKitService.removeCustomerInfoUpdateListener(listenerIdRef.current);
          listenerIdRef.current = null;
        }

        listenerIdRef.current = await storeKitService.addCustomerInfoUpdateListener(
          user.id,
          (nextRevenueCatState) => {
            setSubscription((current) => {
              const nextMerged = mergeSubscriptionSources(
                {
                  is_pro: current.isPro,
                  subscription_status: current.subscriptionStatus,
                  subscription_plan: current.subscriptionPlan,
                  subscription_current_period_end: current.currentPeriodEnd,
                  subscription_cancel_at_period_end: current.cancelAtPeriodEnd,
                  gmail_syncs_used: current.gmailSyncsUsed,
                  trial_ends_at: current.trialEndsAt,
                },
                nextRevenueCatState
              );
              const nextBillLimit = nextMerged.isPro
                ? Number.POSITIVE_INFINITY
                : FREE_BILL_LIMIT;
              const nextGmailSyncsAllowed = nextMerged.isPro
                ? Number.POSITIVE_INFINITY
                : FREE_GMAIL_SYNCS;

              return {
                ...current,
                isPro: nextMerged.isPro,
                subscriptionStatus: nextMerged.subscriptionStatus,
                subscriptionPlan: nextMerged.subscriptionPlan,
                currentPeriodEnd: nextMerged.currentPeriodEnd,
                cancelAtPeriodEnd: nextMerged.cancelAtPeriodEnd,
                trialEndsAt: nextMerged.trialEndsAt,
                isTrialing: nextMerged.subscriptionStatus === 'trialing',
                trialDaysLeft: daysUntil(nextMerged.trialEndsAt),
                billLimit: nextBillLimit,
                canAddBill: nextMerged.isPro || current.billsUsed < FREE_BILL_LIMIT,
                gmailSyncsAllowed: nextGmailSyncsAllowed,
                canSyncGmail:
                  nextMerged.isPro || current.gmailSyncsUsed < FREE_GMAIL_SYNCS,
                canUseCalendar: nextMerged.isPro,
                canUsePaymentLinks: nextMerged.isPro,
                canUseHistory: nextMerged.isPro,
                canUseVariableBills: nextMerged.isPro,
                canCustomizeReminders: nextMerged.isPro,
                canUsePushNotifications: nextMerged.isPro,
                canUseDailyAutoSync: nextMerged.isPro,
                upgradeCtasEnabled: !nextMerged.isPro,
              };
            });
          }
        );
      } catch (error) {
        console.error('Failed to refresh subscription state:', error);
        if (!cancelled) {
          setSubscription((current) => ({
            ...current,
            isLoading: false,
          }));
        }
      }
    };

    void syncSubscription();

    return () => {
      cancelled = true;
      if (listenerIdRef.current) {
        void storeKitService.removeCustomerInfoUpdateListener(listenerIdRef.current);
        listenerIdRef.current = null;
      }
    };
  }, []);

  const refreshSubscription = async () => {
    setSubscription((current) => ({ ...current, isLoading: true }));

    const supabase = supabaseRef.current;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubscription((current) => ({ ...current, isLoading: false }));
      return;
    }

    const [{ data: preferences }, { count }, revenueCat] = await Promise.all([
      supabase
        .from('user_preferences')
        .select(
          'is_pro, subscription_status, subscription_plan, subscription_current_period_end, subscription_cancel_at_period_end, gmail_syncs_used, trial_ends_at'
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      storeKitService.getCustomerState(user.id),
    ]);

    const merged = mergeSubscriptionSources(
      (preferences as PreferencesSnapshot) ?? null,
      revenueCat
    );
    const billsUsed = count ?? 0;

    setSubscription({
      isPro: merged.isPro,
      subscriptionStatus: merged.subscriptionStatus,
      subscriptionPlan: merged.subscriptionPlan,
      currentPeriodEnd: merged.currentPeriodEnd,
      cancelAtPeriodEnd: merged.cancelAtPeriodEnd,
      trialEndsAt: merged.trialEndsAt,
      isTrialing: merged.subscriptionStatus === 'trialing',
      trialDaysLeft: daysUntil(merged.trialEndsAt),
      billsUsed,
      gmailSyncsUsed: merged.gmailSyncsUsed,
      billLimit: merged.isPro ? Number.POSITIVE_INFINITY : FREE_BILL_LIMIT,
      canAddBill: merged.isPro || billsUsed < FREE_BILL_LIMIT,
      gmailSyncsAllowed: merged.isPro
        ? Number.POSITIVE_INFINITY
        : FREE_GMAIL_SYNCS,
      canSyncGmail: merged.isPro || merged.gmailSyncsUsed < FREE_GMAIL_SYNCS,
      canUseCalendar: merged.isPro,
      canUsePaymentLinks: merged.isPro,
      canUseHistory: merged.isPro,
      canUseVariableBills: merged.isPro,
      canCustomizeReminders: merged.isPro,
      canUsePushNotifications: merged.isPro,
      canUseDailyAutoSync: merged.isPro,
      isLoading: false,
      isIosApp: storeKitService.isAvailable,
      upgradeCtasEnabled: !merged.isPro,
    });
  };

  const incrementGmailSyncs = async () => {
    const nextValue = subscription.gmailSyncsUsed + 1;

    setSubscription((current) => ({
      ...current,
      gmailSyncsUsed: nextValue,
      canSyncGmail: current.isPro || nextValue < FREE_GMAIL_SYNCS,
    }));

    await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gmail_syncs_used: nextValue }),
    });
  };

  const value: SubscriptionContextValue = {
    ...subscription,
    showUpgradeModal: (feature: string) => {
      setUpgradeModalFeature(feature);
      setUpgradeModalOpen(true);
    },
    hideUpgradeModal: () => {
      setUpgradeModalFeature(null);
      setUpgradeModalOpen(false);
    },
    refreshSubscription,
    incrementGmailSyncs,
    upgradeModalOpen,
    upgradeModalFeature,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}
