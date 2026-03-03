'use client';

import { ReactNode } from 'react';
import { BillsProvider } from '@/contexts/bills-context';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PushNotificationInit } from '@/components/push-notification-init';

export function DashboardProviders({ children }: { children: ReactNode }) {
  return (
    <BillsProvider>
      <PushNotificationInit />
      {children}
      <MobileBottomNav />
    </BillsProvider>
  );
}
