'use client';

import {
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { SubscriptionStatus, SubscriptionPlan } from '@/types';

export interface SubscriptionState {
  // Core status — always Pro (free app)
  isPro: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: SubscriptionPlan;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;

  // Trial — disabled
  trialEndsAt: string | null;
  isTrialing: boolean;
  trialDaysLeft: number;

  // Usage tracking — unlimited
  billsUsed: number;
  gmailSyncsUsed: number;

  // Computed limits — unlimited
  billLimit: number;
  canAddBill: boolean;
  gmailSyncsAllowed: number;
  canSyncGmail: boolean;

  // Feature flags — all enabled
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
  // Actions (no-ops in free app)
  showUpgradeModal: (feature: string) => void;
  hideUpgradeModal: () => void;
  refreshSubscription: () => Promise<void>;
  incrementGmailSyncs: () => Promise<void>;

  // Modal state — always closed
  upgradeModalOpen: boolean;
  upgradeModalFeature: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  // Everything is unlocked — free app with full access
  const value: SubscriptionContextValue = {
    // Core status — treat as Pro
    isPro: true,
    subscriptionStatus: 'active',
    subscriptionPlan: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,

    // Trial — disabled
    trialEndsAt: null,
    isTrialing: false,
    trialDaysLeft: 0,

    // Usage — unlimited
    billsUsed: 0,
    gmailSyncsUsed: 0,

    // Limits — unlimited
    billLimit: Infinity,
    canAddBill: true,
    gmailSyncsAllowed: Infinity,
    canSyncGmail: true,

    // All features enabled
    canUseCalendar: true,
    canUsePaymentLinks: true,
    canUseHistory: true,
    canUseVariableBills: true,
    canCustomizeReminders: true,
    canUsePushNotifications: true,
    canUseDailyAutoSync: true,

    // Never loading
    isLoading: false,

    // No upgrade CTAs
    isIosApp: false,
    upgradeCtasEnabled: false,

    // Modal — always closed
    upgradeModalOpen: false,
    upgradeModalFeature: null,

    // No-op actions
    showUpgradeModal: () => {},
    hideUpgradeModal: () => {},
    refreshSubscription: async () => {},
    incrementGmailSyncs: async () => {},
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
