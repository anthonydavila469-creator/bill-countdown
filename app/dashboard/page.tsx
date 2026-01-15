'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BillCard, BillListItem } from '@/components/bill-card';
import { AddBillModal } from '@/components/add-bill-modal';
import { DeleteBillModal } from '@/components/delete-bill-modal';
import { BillDetailModal } from '@/components/bill-detail-modal';
import { Bill, DashboardView } from '@/types';
import { getNextDueDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/contexts/theme-context';
import {
  Zap,
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Settings,
  LogOut,
  Bell,
  Mail,
  Search,
  Filter,
  ChevronDown,
  History,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { dashboardLayout } = useTheme();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bills state
  const [bills, setBills] = useState<Bill[]>([]);
  const [view, setView] = useState<DashboardView>(dashboardLayout.defaultView);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync view with layout preference when it changes
  useEffect(() => {
    setView(dashboardLayout.defaultView);
  }, [dashboardLayout.defaultView]);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Check authentication and fetch bills
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in, redirect to login
        router.push('/login');
        return;
      }

      setUser(user);

      // Fetch bills from API
      try {
        const response = await fetch('/api/bills');
        if (response.ok) {
          const data = await response.json();
          setBills(data.sort((a: Bill, b: Bill) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          ));
        }
      } catch (error) {
        console.error('Failed to fetch bills:', error);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Filter and sort bills based on search and layout preferences
  const filteredBills = useMemo(() => {
    const filtered = bills.filter((bill) =>
      bill.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort based on layout preference
    return filtered.sort((a, b) => {
      switch (dashboardLayout.sortBy) {
        case 'amount':
          return (b.amount || 0) - (a.amount || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'due_date':
        default:
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
    });
  }, [bills, searchQuery, dashboardLayout.sortBy]);

  // Calculate stats (only unpaid bills)
  const unpaidBills = bills.filter(b => !b.is_paid);
  const totalDue = unpaidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const billsDueSoon = unpaidBills.filter((bill) => {
    const daysUntil = Math.ceil(
      (new Date(bill.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 7 && daysUntil >= 0;
  });

  // Handle adding/updating a bill
  const handleBillSuccess = async (bill: Bill) => {
    // Refresh bills from API
    try {
      const response = await fetch('/api/bills');
      if (response.ok) {
        const data = await response.json();
        setBills(data.sort((a: Bill, b: Bill) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ));
      }
    } catch (error) {
      console.error('Failed to refresh bills:', error);
    }
    setEditingBill(null);
  };

  // Handle deleting a bill
  const handleDeleteConfirm = async () => {
    if (!deletingBill) return;

    try {
      const response = await fetch(`/api/bills/${deletingBill.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBills((prev) => prev.filter((b) => b.id !== deletingBill.id));
      }
    } catch (error) {
      console.error('Failed to delete bill:', error);
    }

    setDeletingBill(null);
  };

  // Handle bill card click - open detail modal
  const handleBillClick = (bill: Bill) => {
    setSelectedBill(bill);
  };

  // Handle editing a bill from detail modal
  const handleEditFromDetail = (bill: Bill) => {
    setSelectedBill(null);
    setEditingBill(bill);
    setIsAddModalOpen(true);
  };

  // Handle deleting a bill from detail modal
  const handleDeleteFromDetail = (bill: Bill) => {
    setSelectedBill(null);
    setDeletingBill(bill);
  };

  // Handle marking a bill as paid
  const handleMarkAsPaid = async (bill: Bill) => {
    try {
      const response = await fetch(`/api/bills/${bill.id}/pay`, {
        method: 'POST',
      });

      if (response.ok) {
        const { paidBill, nextBill } = await response.json();

        // Update bills list
        setBills((prev) => {
          let updated = prev.filter((b) => b.id !== bill.id);
          if (nextBill) {
            updated = [...updated, nextBill];
          }
          return updated.sort((a, b) =>
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        });
      }
    } catch (error) {
      console.error('Failed to mark bill as paid:', error);
    }

    setSelectedBill(null);
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
    <div className="min-h-screen bg-[#08080c]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0c0c10] border-r border-white/5 hidden lg:flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Bill<span className="text-blue-400">Countdown</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <LayoutGrid className="w-5 h-5" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/calendar"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Calendar
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/history"
                className="flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <History className="w-5 h-5" />
                History
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

        {/* Gmail sync status */}
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
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#08080c]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md mx-4 lg:mx-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="p-2 text-zinc-400 hover:text-white transition-colors relative">
                <Bell className="w-5 h-5" />
                {billsDueSoon.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => {
                  setEditingBill(null);
                  setIsAddModalOpen(true);
                }}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Plus className="w-4 h-4" />
                Add Bill
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard content */}
        <div className="p-6">
          {/* Stats - conditionally rendered based on layout preferences */}
          {dashboardLayout.showStatsBar && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Total Due</p>
                <p className="text-3xl font-bold text-white">
                  ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Bills Due Soon</p>
                <p className="text-3xl font-bold text-orange-400">
                  {billsDueSoon.length}
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Active Bills</p>
                <p className="text-3xl font-bold text-white">{unpaidBills.length}</p>
              </div>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <p className="text-sm text-zinc-400 mb-1">Payment Status</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-400">
                    {unpaidBills.filter(b => b.is_autopay).length}
                  </span>
                  <span className="text-zinc-500">auto</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-2xl font-bold text-amber-400">
                    {unpaidBills.filter(b => !b.is_autopay).length}
                  </span>
                  <span className="text-zinc-500">manual</span>
                </div>
              </div>
            </div>
          )}

          {/* Bills section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Your Bills</h2>
                <p className="text-sm text-zinc-400">
                  {filteredBills.filter(b => !b.is_paid).length} bills sorted by due date
                </p>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                  <Filter className="w-4 h-4" />
                  Filter
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="flex items-center bg-white/5 rounded-lg p-1">
                  <button
                    onClick={() => setView('grid')}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      view === 'grid'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      view === 'list'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-white'
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty state */}
            {filteredBills.filter(b => !b.is_paid).length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {searchQuery ? 'No bills found' : 'No bills yet'}
                </h3>
                <p className="text-zinc-400 mb-6">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Add your first bill to start tracking'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    <Plus className="w-5 h-5" />
                    Add Your First Bill
                  </button>
                )}
              </div>
            )}

            {/* Bills grid/list */}
            {filteredBills.filter(b => !b.is_paid).length > 0 && view === 'grid' && (
              <div
                className={cn(
                  'grid grid-cols-1 gap-4',
                  dashboardLayout.cardsPerRow === 2 && 'sm:grid-cols-2',
                  dashboardLayout.cardsPerRow === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                  dashboardLayout.cardsPerRow === 4 && 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                )}
              >
                {filteredBills.filter(b => !b.is_paid).map((bill, index) => (
                  <div
                    key={bill.id}
                    className="animate-in fade-in slide-in-from-bottom-4"
                    style={{
                      animationDelay: `${index * 75}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <BillCard
                      bill={bill}
                      onClick={() => handleBillClick(bill)}
                      variant={dashboardLayout.cardSize === 'compact' ? 'compact' : 'default'}
                    />
                  </div>
                ))}
              </div>
            )}

            {filteredBills.filter(b => !b.is_paid).length > 0 && view === 'list' && (
              <div className="space-y-3">
                {filteredBills.filter(b => !b.is_paid).map((bill, index) => (
                  <div
                    key={bill.id}
                    className="animate-in fade-in slide-in-from-bottom-2"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: 'backwards',
                    }}
                  >
                    <BillListItem
                      bill={bill}
                      onClick={() => handleBillClick(bill)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => {
          setEditingBill(null);
          setIsAddModalOpen(true);
        }}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: 'var(--accent-primary)',
          boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--accent-primary) 25%, transparent)'
        }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Bill Modal */}
      <AddBillModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingBill(null);
        }}
        onSuccess={handleBillSuccess}
        editBill={editingBill}
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
  );
}
