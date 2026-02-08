import { DashboardProviders } from '@/components/dashboard-providers';

// Force dynamic rendering to prevent static generation errors with Supabase
export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardProviders>{children}</DashboardProviders>;
}
