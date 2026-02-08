'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { AddBillModal } from '@/components/add-bill-modal';
import { BillDetailModal } from '@/components/bill-detail-modal';
import { DeleteBillModal } from '@/components/delete-bill-modal';
import { Bill } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { formatDateString } from '@/lib/calendar-utils';
import { useBillMutations } from '@/hooks/use-bill-mutations';
import { useToast } from '@/components/ui/toast';
import {
  Zap,
  LayoutGrid,
  Calendar,
  Settings,
  LogOut,
  Mail,
  History,
  Loader2,
  Lightbulb,
  Crown,
} from 'lucide-react';
import { ProFeatureGate } from '@/components/pro-feature-gate';
import { useSubscription } from '@/hooks/use-subscription';

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();
  const { canUseCalendar, canUseHistory } = useSubscription();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  // Use shared bills context
  const {
    bills,
    loading: billsLoading,
    markPaid,
    deleteBill,
    updateBill,
    refetch,
    getMutationState,
  } = useBillMutations();

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addBillDate, setAddBillDate] = useState<string | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Check authentication and Gmail connection
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Check if Gmail is connected
      const { data: gmailToken } = await supabase
        .from('gmail_tokens')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setIsGmailConnected(!!gmailToken);
      setIsAuthLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth, supabase]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Combined loading state
  const isLoading = isAuthLoading || billsLoading;

  // Handle bill click from calendar
  const handleBillClick = (bill: Bill) => {
    setSelectedBill(bill);
  };

  // Handle add bill (optionally with pre-filled date)
  const handleAddBill = (date?: Date) => {
    if (date) {
      setAddBillDate(formatDateString(date));
    } else {
      setAddBillDate(null);
    }
    setEditingBill(null);
    setIsAddModalOpen(true);
  };

  // Handle bill success (add/edit)
  const handleBillSuccess = async () => {
    await refetch();
    setEditingBill(null);
    setAddBillDate(null);
  };

  // Handle edit from detail modal
  const handleEditFromDetail = (bill: Bill) => {
    setSelectedBill(null);
    setEditingBill(bill);
    setIsAddModalOpen(true);
  };

  // Handle delete from detail modal
  const handleDeleteFromDetail = (bill: Bill) => {
    setSelectedBill(null);
    setDeletingBill(bill);
  };

  // Handle mark as paid (uses optimistic update)
  const handleMarkAsPaid = async (bill: Bill) => {
    await markPaid(bill);
    setSelectedBill(null);
  };

  // Handle delete confirm (uses optimistic update)
  const handleDeleteConfirm = async () => {
    if (!deletingBill) return;
    await deleteBill(deletingBill.id);
    setDeletingBill(null);
  };

  // Toast for reschedule undo
  const { addToast } = useToast();

  // Handle bill reschedule (drag and drop)
  const handleReschedule = async (billId: string, newDate: string, originalDate: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill) return;

    // Optimistically update the bill's due date
    const result = await updateBill(billId, { due_date: newDate });

    if (result) {
      // Show toast with undo option
      const formattedDate = new Date(newDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      addToast({
        message: 'Due date updated',
        description: `${bill.name} moved to ${formattedDate}`,
        type: 'undo',
        onUndo: async () => {
          // Restore original date
          await updateBill(billId, { due_date: originalDate });
        },
        undoTimeout: 10000,
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ProFeatureGate
      feature="calendar"
      featureName="Calendar View"
      featureDescription="See all your bills laid out on a calendar to better plan your month."
      icon={Calendar}
    >
    <div className="min-h-screen bg-[#08080c]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0c0c10] border-r border-white/5 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo-128.png"
              alt="Duezo"
              width={36}
              height={36}
              className="rounded-xl shadow-lg shadow-blue-500/20"
            />
            <span className="text-lg font-bold text-white tracking-tight">
              Due<span className="text-blue-400">zo</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <LayoutGrid className="w-5 h-5" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/calendar"
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <Calendar className="w-5 h-5" />
                Calendar
                {!canUseCalendar && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 ml-auto">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/history"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <History className="w-5 h-5" />
                History
                {!canUseHistory && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 ml-auto">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/insights"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Lightbulb className="w-5 h-5" />
                Insights
                {!canUseHistory && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 ml-auto">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/settings"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        {/* Gmail sync status - only show if not connected */}
        {!isGmailConnected && (
          <div className="p-4 border-t border-white/5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-white">Gmail Sync</span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                Connect Gmail to automatically detect bills from your inbox.
              </p>
              <Link
                href="/dashboard/settings"
                className="block w-full px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-center"
              >
                Connect Gmail
              </Link>
            </div>
          </div>
        )}

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-medium">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 h-screen overflow-y-auto overscroll-none pb-28 pt-[env(safe-area-inset-top)]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#08080c]">
          {/* Safe area for notch */}
          <div className="h-[env(safe-area-inset-top)] bg-[#08080c]" />
          <div className="flex items-center justify-between px-6 h-16 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2.5">
              <Image
                src="/logo-128.png"
                alt="Duezo"
                width={32}
                height={32}
                className="rounded-lg shadow-lg shadow-blue-500/20"
              />
              <span className="text-lg font-bold text-white tracking-tight">
                Due<span className="text-blue-400">zo</span>
              </span>
            </div>

            {/* Page title */}
            <h1 className="hidden lg:block text-xl font-bold text-white">Calendar</h1>

            {/* Mobile nav hint */}
            <div className="lg:hidden text-sm text-zinc-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </header>

        {/* Calendar content */}
        <div className="p-6">
          <CalendarGrid
            bills={bills}
            onBillClick={handleBillClick}
            onAddBill={handleAddBill}
            onMarkPaid={handleMarkAsPaid}
            onEdit={handleEditFromDetail}
            onReschedule={handleReschedule}
            getMutationState={getMutationState}
            paydayDate={null}
          />
        </div>
      </main>

      {/* Add/Edit Bill Modal */}
      <AddBillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBill(null);
          setAddBillDate(null);
        }}
        onSuccess={handleBillSuccess}
        editBill={editingBill}
        initialDate={addBillDate || undefined}
      />

      {/* Delete Confirmation Modal */}
      <DeleteBillModal
        isOpen={!!deletingBill}
        bill={deletingBill}
        onClose={() => setDeletingBill(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Bill Detail Modal */}
      <BillDetailModal
        isOpen={!!selectedBill}
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        onMarkPaid={handleMarkAsPaid}
      />
    </div>
    </ProFeatureGate>
  );
}
