'use client';

import { useSubscriptionContext } from '@/contexts/subscription-context';

// Re-export the hook with a cleaner name
export function useSubscription() {
  return useSubscriptionContext();
}

// Feature-specific hooks for cleaner component code
export function useCanAddBill() {
  const {
    canAddBill,
    billsUsed,
    billLimit,
    showUpgradeModal,
    upgradeCtasEnabled,
  } = useSubscriptionContext();
  return {
    canAddBill,
    billsUsed,
    billLimit,
    handleAddBillClick: (onAllowed: () => void) => {
      if (canAddBill) {
        onAllowed();
      } else if (upgradeCtasEnabled) {
        showUpgradeModal('unlimited bills');
      }
    },
  };
}

export function useCanSyncGmail() {
  const {
    canSyncGmail,
    gmailSyncsUsed,
    gmailSyncsAllowed,
    isPro,
    showUpgradeModal,
    incrementGmailSyncs,
    upgradeCtasEnabled,
  } = useSubscriptionContext();
  return {
    canSyncGmail,
    gmailSyncsUsed,
    gmailSyncsAllowed,
    isPro,
    showUpgradeModal,
    incrementGmailSyncs,
    handleSyncClick: (onAllowed: () => void) => {
      if (canSyncGmail) {
        onAllowed();
      } else if (upgradeCtasEnabled) {
        showUpgradeModal('unlimited Gmail syncs');
      }
    },
  };
}

export function useFeatureGate(feature: string) {
  const subscription = useSubscriptionContext();

  // Map feature names to subscription flags
  const featureMap: Record<string, boolean> = {
    calendar: subscription.canUseCalendar,
    'payment-links': subscription.canUsePaymentLinks,
    'paycheck-mode': subscription.canUsePaycheckMode,
    history: subscription.canUseHistory,
    analytics: subscription.canUseHistory,
    'variable-bills': subscription.canUseVariableBills,
    'custom-reminders': subscription.canCustomizeReminders,
    'push-notifications': subscription.canUsePushNotifications,
    'auto-sync': subscription.canUseDailyAutoSync,
  };

  const isAllowed = featureMap[feature] ?? false;

  return {
    isAllowed,
    checkAccess: (onAllowed: () => void, onDenied?: () => void) => {
      if (isAllowed) {
        onAllowed();
      } else {
        if (onDenied) {
          onDenied();
        } else if (subscription.upgradeCtasEnabled) {
          subscription.showUpgradeModal(feature);
        }
      }
    },
    showUpgrade: () => {
      if (subscription.upgradeCtasEnabled) {
        subscription.showUpgradeModal(feature);
      }
    },
  };
}
