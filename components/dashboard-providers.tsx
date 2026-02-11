'use client';

import { ReactNode } from 'react';
import { BillsProvider } from '@/contexts/bills-context';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PushNotificationInit } from '@/components/push-notification-init';
import { TrialBanner } from '@/components/trial-banner';

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <BillsProvider>
      <PushNotificationInit />
      <TrialBanner />
      {children}
      <MobileBottomNav />
    </BillsProvider>
  );
}
