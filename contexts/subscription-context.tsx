'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { SubscriptionStatus, SubscriptionPlan } from '@/types';

// Feature limits for free tier
export const FREE_TIER_LIMITS = {
  MAX_BILLS: 5,
  MAX_GMAIL_SYNCS: 1,
} as const;

// Pricing info
export const PRICING = {
  MONTHLY: 4.99,
  YEARLY: 39.99,
  YEARLY_SAVINGS: 33, // percent
} as const;

export interface SubscriptionState {
  // Core status
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;

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
  canUsePaycheckMode: boolean;
  canUseHistory: boolean;
  canUseVariableBills: boolean;
  canCustomizeReminders: boolean;
  canUsePushNotifications: boolean;
  canUseDailyAutoSync: boolean;

  // Loading state
  isLoading: boolean;
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
  // Core status
  const [isPro, setIsPro] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('free');
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  // Usage tracking
  const [billsUsed, setBillsUsed] = useState(0);
  const [gmailSyncsUsed, setGmailSyncsUsed] = useState(0);

  // Loading and modal state
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalFeature, setUpgradeModalFeature] = useState<string | null>(null);

  // Fetch subscription status
  const refreshSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/stripe/status');
      if (!response.ok) {
        // User might not be logged in
        return;
      }

      const data = await response.json();
      setIsPro(data.isPro ?? false);
      setSubscriptionStatus(data.subscriptionStatus ?? 'free');
      setSubscriptionPlan(data.subscriptionPlan ?? null);
      setCurrentPeriodEnd(data.currentPeriodEnd ?? null);
      setCancelAtPeriodEnd(data.cancelAtPeriodEnd ?? false);
      setBillsUsed(data.billsUsed ?? 0);
      setGmailSyncsUsed(data.gmailSyncsUsed ?? 0);
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Increment gmail syncs counter
  const incrementGmailSyncs = useCallback(async () => {
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmail_syncs_used: gmailSyncsUsed + 1 }),
      });
      setGmailSyncsUsed(prev => prev + 1);
    } catch (error) {
      console.error('Failed to increment gmail syncs:', error);
    }
  }, [gmailSyncsUsed]);

  // Modal controls
  const showUpgradeModal = useCallback((feature: string) => {
    setUpgradeModalFeature(feature);
    setUpgradeModalOpen(true);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setUpgradeModalOpen(false);
    setUpgradeModalFeature(null);
  }, []);

  // Computed values
  const billLimit = isPro ? Infinity : FREE_TIER_LIMITS.MAX_BILLS;
  const canAddBill = isPro || billsUsed < FREE_TIER_LIMITS.MAX_BILLS;
  const gmailSyncsAllowed = isPro ? Infinity : FREE_TIER_LIMITS.MAX_GMAIL_SYNCS;
  const canSyncGmail = isPro || gmailSyncsUsed < FREE_TIER_LIMITS.MAX_GMAIL_SYNCS;

  // Feature flags
  const canUseCalendar = isPro;
  const canUsePaymentLinks = isPro;
  const canUsePaycheckMode = isPro;
  const canUseHistory = isPro;
  const canUseVariableBills = isPro;
  const canCustomizeReminders = isPro;
  const canUsePushNotifications = isPro;
  const canUseDailyAutoSync = isPro;

  return (
    <SubscriptionContext.Provider
      value={{
        // Core status
        isPro,
        subscriptionStatus,
        subscriptionPlan,
        currentPeriodEnd,
        cancelAtPeriodEnd,

        // Usage tracking
        billsUsed,
        gmailSyncsUsed,

        // Computed limits
        billLimit,
        canAddBill,
        gmailSyncsAllowed,
        canSyncGmail,

        // Feature flags
        canUseCalendar,
        canUsePaymentLinks,
        canUsePaycheckMode,
        canUseHistory,
        canUseVariableBills,
        canCustomizeReminders,
        canUsePushNotifications,
        canUseDailyAutoSync,

        // Loading state
        isLoading,

        // Modal state
        upgradeModalOpen,
        upgradeModalFeature,

        // Actions
        showUpgradeModal,
        hideUpgradeModal,
        refreshSubscription,
        incrementGmailSyncs,
      }}
    >
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
