'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  UserPlus,
  Mail,
  Activity,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Crown,
  Calendar,
  TrendingUp,
  DollarSign,
  Heart,
  Zap,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_USER_ID = 'a89729f6-54b4-4003-abc9-15dd7b3b69ed';

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  activeUsers7d: number;
  activeUsers30d: number;
  proSubscribers: number;
  conversionRate: number;
  retentionRate30d: number;
  totalEmailConnections: number;
  emailByProvider: { gmail: number; yahoo: number; outlook: number };
  scanSuccessRate: number;
  totalScans: number;
  dailySignups: Record<string, number>;
  users: {
    id: string;
    signupDate: string;
    isActive: boolean;
    hasEmail: boolean;
  }[];
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  gradient,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  suffix?: string;
  gradient: string;
  index: number;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
    >
      <div className={cn('absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br', gradient)} />
      <div className="relative p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('p-2 rounded-xl bg-gradient-to-br', gradient)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <p className="text-3xl font-bold text-white tracking-tight mb-0.5">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-lg text-zinc-400 ml-0.5">{suffix}</span>}
        </p>
        <p className="text-sm text-zinc-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, gradient, title, subtitle }: {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <div className={cn('relative p-3 rounded-2xl bg-gradient-to-br', gradient)}>
        <Icon className="w-5 h-5 text-white relative z-10" />
        <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br blur-xl opacity-40', gradient)} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
        <p className="text-sm text-zinc-500">{subtitle}</p>
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
      if (res.status === 403) { router.push('/dashboard'); return; }
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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== ADMIN_USER_ID) { router.push('/dashboard'); return; }
      fetchStats();
    };
    init();
  }, [supabase.auth, router, fetchStats]);

  useEffect(() => {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0A1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#0F0A1E]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0F0A1E]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-6 h-16">
          <Link href="/dashboard/settings" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Settings</span>
          </Link>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h1 className="text-lg font-semibold text-white">Command Center</h1>
          </div>
          <button onClick={() => { setIsRefreshing(true); fetchStats(); }} disabled={isRefreshing} className="p-2 text-zinc-400 hover:text-white transition-colors">
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </header>

      <div className="p-6 max-w-2xl mx-auto space-y-10 pb-28 pt-2">
        {/* Live indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live · Updated {lastRefresh.toLocaleTimeString()}</span>
        </div>

        {/* Growth Section */}
        <section>
          <SectionHeader icon={TrendingUp} gradient="from-violet-500/80 to-purple-600/80" title="Growth" subtitle="User acquisition & engagement" />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={Users} label="Total Users" value={stats.totalUsers} gradient="from-violet-500/80 to-purple-600/80" index={0} />
            <MetricCard icon={UserPlus} label="New Today" value={stats.newUsersToday} gradient="from-emerald-500/80 to-teal-600/80" index={1} />
            <MetricCard icon={Activity} label="Active (7d)" value={stats.activeUsers7d} gradient="from-cyan-500/80 to-blue-600/80" index={2} />
            <MetricCard icon={Activity} label="Active (30d)" value={stats.activeUsers30d} gradient="from-blue-500/80 to-indigo-600/80" index={3} />
          </div>
        </section>

        {/* Revenue Section */}
        <section>
          <SectionHeader icon={DollarSign} gradient="from-emerald-500/80 to-green-600/80" title="Revenue" subtitle="Monetization & conversions" />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={Crown} label="Pro Subscribers" value={stats.proSubscribers} gradient="from-amber-500/80 to-orange-600/80" index={4} />
            <MetricCard icon={TrendingUp} label="Conversion Rate" value={stats.conversionRate} suffix="%" gradient="from-emerald-500/80 to-green-600/80" index={5} />
          </div>
        </section>

        {/* Retention Section */}
        <section>
          <SectionHeader icon={Heart} gradient="from-rose-500/80 to-pink-600/80" title="Retention" subtitle="Are users coming back?" />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={Heart} label="30d Retention" value={stats.retentionRate30d} suffix="%" gradient="from-rose-500/80 to-pink-600/80" index={6} />
            <MetricCard icon={Mail} label="Email Connected" value={stats.totalEmailConnections} gradient="from-red-500/80 to-rose-600/80" index={7} />
          </div>
        </section>

        {/* Product Health */}
        <section>
          <SectionHeader icon={Zap} gradient="from-amber-500/80 to-yellow-600/80" title="Product Health" subtitle="Is the AI working?" />
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={Zap} label="Scan Success" value={stats.scanSuccessRate} suffix="%" gradient="from-amber-500/80 to-yellow-600/80" index={8} />
            <MetricCard icon={BarChart3} label="Total Scans" value={stats.totalScans} gradient="from-orange-500/80 to-amber-600/80" index={9} />
          </div>
        </section>

        {/* Email Providers */}
        <section>
          <SectionHeader icon={Mail} gradient="from-blue-500/80 to-indigo-600/80" title="Email Providers" subtitle="Connection breakdown" />
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/[0.06]">
              <div className="text-2xl font-bold text-red-400">{stats.emailByProvider.gmail}</div>
              <div className="text-xs text-zinc-500 mt-1">Gmail</div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/[0.06]">
              <div className="text-2xl font-bold text-purple-400">{stats.emailByProvider.yahoo}</div>
              <div className="text-xs text-zinc-500 mt-1">Yahoo</div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 text-center border border-white/[0.06]">
              <div className="text-2xl font-bold text-blue-400">{stats.emailByProvider.outlook}</div>
              <div className="text-xs text-zinc-500 mt-1">Outlook</div>
            </div>
          </div>
        </section>

        {/* Users List */}
        <section>
          <SectionHeader icon={Users} gradient="from-violet-500/80 to-blue-600/80" title="Users" subtitle={`${stats.users.length} registered`} />
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Email</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-center">Status</span>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Joined</span>
            </div>

            {stats.users.length === 0 ? (
              <div className="px-5 py-8 text-center text-zinc-500 text-sm">No users yet</div>
            ) : (
              stats.users.map((user, i) => (
                <div
                  key={user.id}
                  className={cn(
                    'grid grid-cols-4 gap-2 px-5 py-3 hover:bg-white/[0.03] transition-colors',
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
                      {user.id.substring(0, 8)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    {user.hasEmail ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Connected</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.03] text-zinc-600">None</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end text-zinc-500">
                    <span className="text-sm">
                      {new Date(user.signupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
