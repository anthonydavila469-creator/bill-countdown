'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, type FormEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Zap,
  LayoutGrid,
  Calendar,
  History,
  Settings,
  LogOut,
  Mail,
  Shield,
  Crown,
  User,
  Check,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Loader2,
  Trash2,
  ExternalLink,
  Lightbulb,
  RefreshCw,
  ArrowRight,
  Clock as ClockIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BillImportModal } from '@/components/bill-import-modal';
import { CustomizationSection } from '@/components/settings/customization-section';
import { NotificationSection } from '@/components/settings/notification-section';
import { DeleteAccountModal } from '@/components/settings/delete-account-modal';
import { useBillsContext } from '@/contexts/bills-context';

// Premium section header component - matches CustomizationSection
function SectionHeader({
  icon: Icon,
  iconGradient,
  title,
  description,
  action,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconGradient: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  index?: number;
}) {
  return (
    <div
      className="flex items-center justify-between mb-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4">
        <div className={cn('relative p-3 rounded-2xl bg-gradient-to-br', iconGradient)}>
          <Icon className="w-5 h-5 text-white relative z-10" />
          <div className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br blur-xl opacity-40', iconGradient)} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// Premium toggle switch - matches CustomizationSection
function PremiumToggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={cn(
        'relative w-14 h-8 rounded-full transition-all duration-300',
        !enabled && 'bg-white/10',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      style={enabled ? { backgroundColor: 'var(--accent-primary)' } : undefined}
    >
      {/* Track glow when active */}
      {enabled && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-50"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        />
      )}
      {/* Thumb */}
      <div
        className={cn(
          'absolute top-1 w-6 h-6 rounded-full transition-all duration-300',
          'bg-white shadow-lg',
          enabled ? 'left-7' : 'left-1'
        )}
      >
        {/* Thumb highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-zinc-200" />
      </div>
    </button>
  );
}

// Premium toggle field row
function ToggleRow({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  index?: number;
}) {
  return (
    <div
      className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <div>
          <p className="font-medium text-white tracking-wide">{label}</p>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <PremiumToggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

// Premium select field row
function SelectRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  options,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  index?: number;
}) {
  return (
    <div
      className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
      style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <div>
          <p className="font-medium text-white tracking-wide">{label}</p>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'appearance-none pl-4 pr-10 py-2.5 min-w-[160px]',
            'bg-white/[0.04] hover:bg-white/[0.08]',
            'border border-white/[0.08] hover:border-white/[0.15]',
            'rounded-xl text-white text-sm font-medium tracking-wide',
            'focus:outline-none focus:ring-2 focus:ring-white/20',
            'cursor-pointer transition-all duration-200'
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { refetch } = useBillsContext();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);


  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth, supabase]);



  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };



  // Handle delete account
  const handleDeleteAccount = async (password: string) => {
    const response = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm_password: password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete account');
    }

    // Sign out and redirect to home
    await supabase.auth.signOut();
    router.push('/');
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0A1E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0A1E]">
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
              className="rounded-xl shadow-lg shadow-violet-500/20"
            />
            <span className="text-lg font-bold text-white tracking-tight">
              Due<span className="text-violet-400">zo</span>
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
                className="flex items-center gap-3 px-3 py-2 text-white bg-white/5 rounded-lg"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
            </li>
          </ul>
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center text-white font-medium">
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
        <header className="sticky top-0 z-40 bg-[#0F0A1E]/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-6 h-16">
            {/* Mobile menu */}
            <Link
              href="/dashboard"
              className="lg:hidden flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <LayoutGrid className="w-5 h-5" />
            </Link>

            <h1 className="text-lg font-semibold text-white">Settings</h1>

            <div className="w-10 lg:hidden" />
          </div>
        </header>

        {/* Content */}
        <div className="p-6 max-w-2xl mx-auto space-y-10">
          {/* Notification Preferences */}
          <section>
            <NotificationSection />
          </section>

          {/* Customization Section */}
          <section>
            <CustomizationSection />
          </section>

          {/* Support */}
          <section>
            <SectionHeader
              icon={User}
              iconGradient="from-blue-500/80 to-cyan-500/80"
              title="Support"
              description="Get help with Duezo"
            />
            <div className="mt-3 rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.03]">
              <a
                href="mailto:support@duezo.app"
                className="flex items-center justify-between px-4 py-4 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-blue-400 text-sm">✉️</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Contact Support</p>
                    <p className="text-xs text-zinc-500">support@duezo.app</p>
                  </div>
                </div>
                <span className="text-zinc-600 text-xs">→</span>
              </a>
            </div>
          </section>

          {/* Account */}
          <section>
            <SectionHeader
              icon={User}
              iconGradient="from-violet-500/80 to-violet-500/80"
              title="Account"
              description="Manage your account settings"
              index={2}
            />

            <div
              className="relative overflow-hidden p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
            >
              {/* Subtle gradient accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/5 to-violet-500/5 rounded-full blur-2xl" />

              <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {/* Premium avatar with glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-pink-500 rounded-2xl blur-lg opacity-40" />
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {user?.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                      {/* Shine effect */}
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 via-transparent to-black/10" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-white tracking-wide">
                      {user?.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-sm text-zinc-500">{user?.email}</p>
                  </div>
                </div>

              </div>

              <button
                onClick={handleSignOut}
                className="group relative flex items-center justify-center gap-2.5 w-full px-5 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all duration-300"
              >
                <LogOut className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                <span className="font-medium text-zinc-300 group-hover:text-white tracking-wide transition-colors">
                  Sign Out
                </span>
              </button>
            </div>
          </section>

          {/* Admin Dashboard - only visible to admin */}
          {user?.id === 'a89729f6-54b4-4003-abc9-15dd7b3b69ed' && (
            <section>
              <SectionHeader
                icon={Crown}
                iconGradient="from-amber-500/80 to-orange-500/80"
                title="Admin Dashboard"
                description="Platform metrics & user management"
                index={3}
              />

              <Link
                href="/dashboard/admin"
                className="group relative flex items-center justify-between p-5 overflow-hidden rounded-2xl border border-white/[0.06] hover:border-amber-500/20 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}
              >
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-full blur-2xl group-hover:opacity-100 opacity-0 transition-opacity" />
                <div className="relative flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/15 transition-colors">
                    <Shield className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white tracking-wide">View Admin Stats</p>
                    <p className="text-sm text-zinc-500">Users, bills, connections & more</p>
                  </div>
                </div>
                <span className="text-zinc-600 group-hover:text-amber-400 transition-colors text-sm">→</span>
              </Link>
            </section>
          )}

          {/* Danger Zone */}
          <section>
            <SectionHeader
              icon={AlertTriangle}
              iconGradient="from-red-500/80 to-rose-500/80"
              title="Danger Zone"
              description="Irreversible account actions"
              index={4}
            />

            <div
              className="relative overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
            >
              {/* Dramatic red glow background */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-rose-500/[0.02]" />
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl" />

              {/* Hazard pattern border */}
              <div className="absolute inset-0 border border-red-500/10 rounded-2xl" />
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

              <div className="relative p-6">
                <div className="flex items-start gap-5 mb-5">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-red-500/20 rounded-xl blur-lg animate-pulse" />
                    <div className="relative p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <p className="font-semibold text-white tracking-wide mb-1">Delete Account</p>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Permanently delete your account and all associated data including bills,
                      payment history, and preferences. This action cannot be undone.
                    </p>
                  </div>
                </div>

                {/* Warning notice */}
                <div className="p-4 rounded-xl bg-red-500/[0.03] border border-red-500/10 mb-5">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300/80">
                      This will immediately remove all your data from our servers.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="group relative px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-xl transition-all duration-300"
                >
                  <span className="font-medium text-red-400 group-hover:text-red-300 tracking-wide transition-colors">
                    Delete Account
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-white/[0.04]">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-600">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium tracking-wide">Duezo v1.0.0</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Link
                  href="/privacy"
                  className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  Privacy Policy
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <span className="text-zinc-700">•</span>
                <Link
                  href="/terms"
                  className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  Terms of Service
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        userEmail={user?.email || ''}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
