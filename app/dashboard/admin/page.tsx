'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  UserPlus,
  Receipt,
  FilePlus,
  Mail,
  Activity,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Crown,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_USER_ID = 'a89729f6-54b4-4003-abc9-15dd7b3b69ed';

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  totalBills: number;
  billsToday: number;
  gmailConnections: number;
  activeUsers: number;
  users: {
    id: string;
    billCount: number;
    signupDate: string;
  }[];
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  gradient: string;
  index: number;
}

function StatCard({ icon: Icon, label, value, gradient, index }: StatCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
    >
      {/* Gradient glow on hover */}
      <div className={cn('absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br', gradient)} />

      <div className="relative p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={cn('p-2.5 rounded-xl bg-gradient-to-br', gradient)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight mb-1">
          {value.toLocaleString()}
        </p>
        <p className="text-sm text-zinc-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  // Auth check + initial fetch
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== ADMIN_USER_ID) {
        router.push('/dashboard');
        return;
      }
      fetchStats();
    };
    init();
  }, [supabase.auth, router, fetchStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchStats();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0A1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-zinc-400">Loading admin stats...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards: Omit<StatCardProps, 'index'>[] = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, gradient: 'from-violet-500/80 to-purple-600/80' },
    { icon: UserPlus, label: 'New Users Today', value: stats.newUsersToday, gradient: 'from-emerald-500/80 to-teal-600/80' },
    { icon: Receipt, label: 'Total Bills', value: stats.totalBills, gradient: 'from-blue-500/80 to-indigo-600/80' },
    { icon: FilePlus, label: 'Bills Added Today', value: stats.billsToday, gradient: 'from-amber-500/80 to-orange-600/80' },
    { icon: Mail, label: 'Gmail Connections', value: stats.gmailConnections, gradient: 'from-red-500/80 to-rose-600/80' },
    { icon: Activity, label: 'Active Users (7d)', value: stats.activeUsers, gradient: 'from-cyan-500/80 to-blue-600/80' },
  ];

  return (
    <div className="min-h-screen bg-[#0F0A1E]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0F0A1E]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-6 h-16">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Settings</span>
          </Link>

          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 max-w-2xl mx-auto space-y-10 pb-28 pt-2">
        {/* Last updated */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Auto-refreshing · Updated {lastRefresh.toLocaleTimeString()}
          </span>
        </div>

        {/* Stats Grid */}
        <section>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-violet-500/80 to-purple-600/80">
              <Activity className="w-5 h-5 text-white relative z-10" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/80 to-purple-600/80 blur-xl opacity-40" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Overview</h3>
              <p className="text-sm text-zinc-500">Real-time platform metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {statCards.map((card, i) => (
              <StatCard key={card.label} {...card} index={i} />
            ))}
          </div>
        </section>

        {/* Users List */}
        <section>
          <div className="flex items-center gap-4 mb-5">
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-500/80 to-cyan-500/80">
              <Users className="w-5 h-5 text-white relative z-10" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/80 to-cyan-500/80 blur-xl opacity-40" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">Users</h3>
              <p className="text-sm text-zinc-500">{stats.users.length} registered users</p>
            </div>
          </div>

          <div
            className="rounded-2xl border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500"
            style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}
          >
            {/* Table header */}
            <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">User ID</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Bills</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Signed Up</span>
            </div>

            {/* User rows */}
            {stats.users.length === 0 ? (
              <div className="px-5 py-8 text-center text-zinc-500 text-sm">No users yet</div>
            ) : (
              stats.users.map((user, i) => (
                <div
                  key={user.id}
                  className={cn(
                    'grid grid-cols-3 gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors',
                    i < stats.users.length - 1 && 'border-b border-white/[0.04]'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400/20 to-purple-500/20 border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-violet-300">
                        {user.id.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-zinc-300 font-mono truncate">
                      {user.id.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className={cn(
                      'text-sm font-semibold px-2.5 py-0.5 rounded-full',
                      user.billCount > 0
                        ? 'text-violet-300 bg-violet-500/10'
                        : 'text-zinc-500 bg-white/[0.03]'
                    )}>
                      {user.billCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 text-zinc-500">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="text-sm">
                      {new Date(user.signupDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
