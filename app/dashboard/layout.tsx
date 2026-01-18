'use client';

import { BillsProvider } from '@/contexts/bills-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BillsProvider>{children}</BillsProvider>;
}
