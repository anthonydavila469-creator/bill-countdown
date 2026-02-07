'use client';

import { BillsProvider } from '@/contexts/bills-context';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BillsProvider>
      {children}
      <MobileBottomNav />
    </BillsProvider>
  );
}
