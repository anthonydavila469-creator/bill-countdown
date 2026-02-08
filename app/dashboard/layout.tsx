'use client';

import { BillsProvider } from '@/contexts/bills-context';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { PushNotificationInit } from '@/components/push-notification-init';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BillsProvider>
      <PushNotificationInit />
      {children}
      <MobileBottomNav />
    </BillsProvider>
  );
}
