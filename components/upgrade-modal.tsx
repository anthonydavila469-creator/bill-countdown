'use client';

import { useSubscription } from '@/hooks/use-subscription';
import { Paywall } from './paywall';

export function UpgradeModal() {
  const { upgradeModalOpen, upgradeModalFeature, hideUpgradeModal } = useSubscription();

  return (
    <Paywall
      isOpen={upgradeModalOpen}
      onClose={hideUpgradeModal}
      triggerFeature={upgradeModalFeature ?? undefined}
    />
  );
}
