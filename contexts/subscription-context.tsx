'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@/lib/supabase/client';
import { storeKitService } from '@/lib/storekit';
import { SubscriptionStatus, SubscriptionPlan, SubscriptionTier } from '@/types';

const FREE_BILL_LIMIT = 5;

export interface SubscriptionState {
  // Core status
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  subscriptionTier: SubscriptionTier;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;

  // Trial
  trialEndsAt: string | null;
  isTrialing: boolean;
  trialDaysLeft: number;

  // Usage tracking
  billsUsed: number;
  gmailSyncsUsed: number;

  // Computed limits
  billLimit: number;
  canAddBill: boolean;
  gmailSyncsAllowed: number;
  canSyncGmail: boolean;

  // Feature flags
  canUseCalendar: boolean;
  canUsePaymentLinks: boolean;
  canUseHistory: boolean;
  canUseVariableBills: boolean;
  canCustomizeReminders: boolean;
  canUsePushNotifications: boolean;
  canUseDailyAutoSync: boolean;

  // Loading state
  isLoading: boolean;

  // Platform flags
  isIosApp: boolean;
  upgradeCtasEnabled: boolean;
}

interface SubscriptionContextValue extends SubscriptionState {
  // Actions
  showUpgradeModal: (feature: string) => void;
  hideUpgradeModal: () => void;
  refreshSubscription: () => Promise<void>;
  incrementGmailSyncs: () => Promise<void>;

  // Modal state
  upgradeModalOpen: boolean;
  upgradeModalFeature: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const supabase = createClient();

  // Platform detection
  const isIosApp = typeof window !== 'undefined'
    && Capacitor.isNativePlatform()
    && Capacitor.getPlatform() === 'ios';

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('free');
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [billsUsed, setBillsUsed] = useState(0);
  const [gmailSyncsUsed, setGmailSyncsUsed] = useState(0);

  // Modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<string | null>(null);

  const isPro = subscriptionTier === 'pro';
  const isTrialing = subscriptionStatus === 'trialing';
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Limits
  const billLimit = isPro ? Infinity : FREE_BILL_LIMIT;
  const canAddBill = isPro || billsUsed < FREE_BILL_LIMIT;
  const gmailSyncsAllowed = isPro ? Infinity : 0;
  const canSyncGmail = isPro;

  // Feature flags
  const canUseCalendar = isPro;
  const canUsePaymentLinks = isPro;
  const canUseHistory = isPro;
  const canUseVariableBills = isPro;
  const canCustomizeReminders = isPro;
  const canUsePushNotifications = isPro;
  const canUseDailyAutoSync = isPro;

  // Show upgrade CTAs on iOS when not pro
  const upgradeCtasEnabled = isIosApp && !isPro;

  const fetchSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Initialize RevenueCat with user ID on iOS
      if (isIosApp) {
        await storeKitService.setAppUserId(user.id);
      }

      // Fetch subscription from Supabase
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('subscription_status, subscription_tier, subscription_plan, subscription_current_period_end, subscription_cancel_at_period_end, trial_ends_at, gmail_syncs_used, revenucat_customer_id, subscription_expires_at')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        setSubscriptionTier((prefs.subscription_tier as SubscriptionTier) || 'free');
        setSubscriptionStatus((prefs.subscription_status as SubscriptionStatus) || 'free');
        setSubscriptionPlan(prefs.subscription_plan as SubscriptionPlan);
        setCurrentPeriodEnd(prefs.subscription_current_period_end || prefs.subscription_expires_at);
        setCancelAtPeriodEnd(prefs.subscription_cancel_at_period_end || false);
        setTrialEndsAt(prefs.trial_ends_at);
        setGmailSyncsUsed(prefs.gmail_syncs_used || 0);
      }

      // On iOS, also check RevenueCat for real-time status
      if (isIosApp) {
        const rcInfo = await storeKitService.getCustomerInfo();
        if (rcInfo.isPro) {
          setSubscriptionTier('pro');
          setSubscriptionStatus(rcInfo.isTrialing ? 'trialing' : 'active');
          if (rcInfo.expirationDate) {
            setCurrentPeriodEnd(rcInfo.expirationDate);
          }
        }
      }

      // Count user's bills
      const { count } = await supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setBillsUsed(count || 0);
    } catch (err) {
      console.error('[Subscription] Error fetching subscription:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, isIosApp]);

  // Fetch on mount
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const showUpgradeModal = useCallback((feature: string) => {
    setUpgradeModalFeature(feature);
    setUpgradeModalOpen(true);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
    setUpgradeModalFeature(null);
  }, []);

  const refreshSubscription = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  const incrementGmailSyncs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newCount = gmailSyncsUsed + 1;
    setGmailSyncsUsed(newCount);

    await supabase
      .from('user_preferences')
      .update({ gmail_syncs_used: newCount })
      .eq('user_id', user.id);
  }, [supabase, gmailSyncsUsed]);

  const value: SubscriptionContextValue = {
    isPro,
    subscriptionStatus,
    subscriptionPlan,
    subscriptionTier,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    trialEndsAt,
    isTrialing,
    trialDaysLeft,
    billsUsed,
    gmailSyncsUsed,
    billLimit,
    canAddBill,
    gmailSyncsAllowed,
    canSyncGmail,
    canUseCalendar,
    canUsePaymentLinks,
    canUseHistory,
    canUseVariableBills,
    canCustomizeReminders,
    canUsePushNotifications,
    canUseDailyAutoSync,
    isLoading,
    isIosApp,
    upgradeCtasEnabled,
    upgradeModalOpen,
    upgradeModalFeature,
    showUpgradeModal,
    hideUpgradeModal,
    refreshSubscription,
    incrementGmailSyncs,
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
