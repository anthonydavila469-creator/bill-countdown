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
  Forward,
  BookOpen,
  Clock as ClockIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BillImportModal } from '@/components/bill-import-modal';
import { CustomizationSection } from '@/components/settings/customization-section';
import { NotificationSection } from '@/components/settings/notification-section';
import { DeleteAccountModal } from '@/components/settings/delete-account-modal';
import { InboxAddress } from '@/components/forwarding/InboxAddress';
import { SetupGuide } from '@/components/forwarding/SetupGuide';
import { BillWaiting } from '@/components/forwarding/BillWaiting';
import { ParsedBill } from '@/types';
import { useBillsContext } from '@/contexts/bills-context';

type EmailProviderName = 'gmail' | 'yahoo' | 'outlook';

interface EmailConnectionState {
  provider: EmailProviderName;
  email: string;
}

const EMAIL_PROVIDERS: Array<{
  name: EmailProviderName;
  label: string;
  color: string;
  logo: string;
  description: string;
  borderColor: string;
  bgTint: string;
  glowColor: string;
}> = [
  {
    name: 'gmail',
    label: 'Gmail',
    color: '#EA4335',
    logo: '/logos/gmail.png',
    description: 'Google account',
    borderColor: 'border-red-500/20 hover:border-red-500/40',
    bgTint: 'bg-red-500/[0.04] hover:bg-red-500/[0.08]',
    glowColor: 'rgba(234, 67, 53, 0.12)',
  },
  {
    name: 'yahoo',
    label: 'Yahoo Mail',
    color: '#6001D2',
    logo: '/logos/yahoo.png',
    description: 'Yahoo account',
    borderColor: 'border-purple-500/20 hover:border-purple-500/40',
    bgTint: 'bg-purple-500/[0.04] hover:bg-purple-500/[0.08]',
    glowColor: 'rgba(96, 1, 210, 0.12)',
  },
  {
    name: 'outlook',
    label: 'Outlook',
    color: '#0078D4',
    logo: '/logos/outlook.png',
    description: 'Microsoft account',
    borderColor: 'border-blue-500/20 hover:border-blue-500/40',
    bgTint: 'bg-blue-500/[0.04] hover:bg-blue-500/[0.08]',
    glowColor: 'rgba(0, 120, 212, 0.12)',
  },
];

function getProviderLabel(provider: EmailProviderName): string {
  return EMAIL_PROVIDERS.find((item) => item.name === provider)?.label || 'Email';
}

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

// Google icon SVG
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
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
  const [emailConnection, setEmailConnection] = useState<EmailConnectionState | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<EmailProviderName | null>(null);
  const [yahooEmail, setYahooEmail] = useState('');
  const [yahooAppPassword, setYahooAppPassword] = useState('');
  const [isConnectingYahoo, setIsConnectingYahoo] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isForceRescanning, setIsForceRescanning] = useState(false);
  const [showForceRescanConfirm, setShowForceRescanConfirm] = useState(false);

  // Auto-scan state (triggers after OAuth redirect)
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [autoScanNoResults, setAutoScanNoResults] = useState(false);

  // Forwarding inbox state
  const [inboxAddress, setInboxAddress] = useState<string | null>(null);
  const [inboxData, setInboxData] = useState<{ bills_received?: number; last_bill_at?: string } | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isLoadingInbox, setIsLoadingInbox] = useState(true);

  // Check authentication and connected email provider status
  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const oauthError = urlParams.get('error');
      const errorDetails = urlParams.get('details');
      if (oauthError) {
        console.error('Email OAuth error:', oauthError, errorDetails);
        alert(`Email connection failed: ${errorDetails || oauthError}`);
        // Clean URL for error case only — success params are handled by auto-scan useEffect
        window.history.replaceState({}, '', window.location.pathname);
      }
      const gmailJustConnected = urlParams.get('gmail') === 'connected';
      const providerFromUrl = (urlParams.get('provider') as EmailProviderName | null) || 'gmail';

      if (gmailJustConnected || urlParams.get('provider_connected')) {
        setEmailConnection((current) => current || {
          provider: providerFromUrl,
          email: '',
        });
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      setYahooEmail((current) => current || user.email || '');

      const { data: gmailToken } = await supabase
        .from('gmail_tokens')
        .select('email, email_provider')
        .eq('user_id', user.id)
        .single();

      if (gmailToken) {
        setEmailConnection({
          provider: (gmailToken.email_provider || 'gmail') as EmailProviderName,
          email: gmailToken.email || user.email || '',
        });
      } else if (!gmailJustConnected) {
        setEmailConnection(null);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth, supabase]);

  // Fetch forwarding inbox state
  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await fetch(`/api/inbound/inbox?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;

        const data = await res.json();
        setInboxAddress(data.inbox_address || null);
        if (data.inbox) setInboxData(data.inbox);
      } catch {
        // Silently ignore — inbox section will show "get address" state
      } finally {
        setIsLoadingInbox(false);
      }
    };

    if (!isLoading) fetchInbox();
  }, [isLoading]);

  // Auto-scan after OAuth provider connect
  // Detects URL params like ?gmail=connected or ?provider_connected=Gmail
  useEffect(() => {
    if (isLoading || isAutoScanning) return;

    const urlParams = new URLSearchParams(window.location.search);
    const gmailJustConnected = urlParams.get('gmail') === 'connected';
    const providerConnected = urlParams.get('provider_connected');

    if (!gmailJustConnected && !providerConnected) return;

    // Clear URL params immediately to prevent re-trigger on refresh
    window.history.replaceState({}, '', window.location.pathname);

    const runAutoScan = async () => {
      setIsAutoScanning(true);
      setAutoScanNoResults(false);

      try {
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ maxResults: 200, daysBack: 60, skipAI: false }),
        });

        if (!response.ok) {
          console.error('Auto-scan failed:', await response.text());
          setIsAutoScanning(false);
          return;
        }

        const { suggestions } = await response.json();

        setIsAutoScanning(false);

        if (suggestions && suggestions.length > 0) {
          // Open the import modal — it will re-fetch suggestions internally
          setIsImportModalOpen(true);
        } else {
          // Show friendly "no bills found" message
          setAutoScanNoResults(true);
        }
      } catch (error) {
        console.error('Auto-scan error:', error);
        setIsAutoScanning(false);
      }
    };

    runAutoScan();
  }, [isLoading]); // Only re-run when loading completes

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleConnectProvider = async (provider: EmailProviderName) => {
    if (provider === 'yahoo') {
      setSelectedProvider('yahoo');
      return;
    }

    let connectUrl = `${window.location.origin}/api/email/connect?provider=${provider}`;

    // Always try to attach the access token — works for both Capacitor and web
    // In-app browsers and Capacitor webviews may not carry cookies
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        connectUrl += `&access_token=${session.access_token}`;
      }
    } catch (e) {
      console.error('Failed to get session for email connect:', e);
    }

    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: connectUrl, presentationStyle: 'fullscreen' });
    } else {
      window.location.href = connectUrl;
    }
  };

  const handleYahooPasswordConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!yahooEmail.trim() || !yahooAppPassword.trim()) {
      alert('Enter your Yahoo email and app password.');
      return;
    }

    setIsConnectingYahoo(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/email/connect-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: yahooEmail.trim(),
          appPassword: yahooAppPassword.trim(),
          provider: 'yahoo',
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to connect Yahoo Mail');
      }

      setEmailConnection({
        provider: 'yahoo',
        email: yahooEmail.trim(),
      });
      setSelectedProvider(null);
      setYahooAppPassword('');
    } catch (error) {
      console.error('Yahoo password connect failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to connect Yahoo Mail');
    } finally {
      setIsConnectingYahoo(false);
    }
  };

  const handleDisconnectEmail = async () => {
    try {
      await fetch('/api/email/disconnect', { method: 'POST' });
      setEmailConnection(null);
    } catch (error) {
      console.error('Failed to disconnect email provider:', error);
    }
  };

  const handleImportBills = async (bills: ParsedBill[]) => {
    try {

      const response = await fetch('/api/bills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bills }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Import failed:', result);
        throw new Error(result.error || 'Failed to import bills');
      }


      // Refetch bills to update the context before navigating
      await refetch();

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to import bills:', error);
      throw error; // Re-throw so the modal can show the error
    }
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

  // Handle force rescan
  const handleForceRescan = async () => {
    setIsForceRescanning(true);
    setShowForceRescanConfirm(false);

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRescan: true, skipAI: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to rescan emails');
      }

      const result = await response.json();

      // If we got suggestions, open the import modal
      if (result.suggestions && result.suggestions.length > 0) {
        setIsImportModalOpen(true);
      }
    } catch (error) {
      console.error('Force rescan failed:', error);
    } finally {
      setIsForceRescanning(false);
    }
  };

  // Loading state
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

        {!emailConnection && (
          <div className="p-4 border-t border-white/5">
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/10 border border-white/5">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-5 h-5 text-violet-400" />
                <span className="text-sm font-medium text-white">Email Sync</span>
              </div>
              <p className="text-xs text-zinc-400 mb-3">
                Connect Gmail, Yahoo Mail, or Outlook to detect bills from your inbox.
              </p>
              <Link
                href="/dashboard/settings"
                className="block w-full px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-center"
              >
                Connect Email
              </Link>
            </div>
          </div>
        )}

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
          {/* Auto-scan spinner after OAuth redirect */}
          {isAutoScanning && (
            <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] to-blue-500/[0.04] p-8 animate-in fade-in duration-500">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAxKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
              <div className="relative flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-violet-500/30 rounded-full blur-xl animate-pulse" />
                  <div className="relative p-4 rounded-full bg-violet-500/10 border border-violet-500/20">
                    <Mail className="w-8 h-8 text-violet-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Scanning your inbox...</h3>
                  <p className="text-sm text-zinc-400">Looking for bills and due dates in your emails</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                  <span className="text-xs text-zinc-500">This may take a moment</span>
                </div>
              </div>
            </div>
          )}

          {/* No bills found after auto-scan */}
          {autoScanNoResults && (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] to-teal-500/[0.02] p-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">Email connected successfully!</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                    No bills found yet — that&apos;s okay! We&apos;ll automatically scan again tomorrow during auto-sync 
                    and notify you when we find new bills.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Daily auto-sync is active</span>
                  </div>
                </div>
                <button
                  onClick={() => setAutoScanNoResults(false)}
                  className="flex-shrink-0 p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Bill Forwarding */}
          <section>
            <SectionHeader
              icon={Forward}
              iconGradient="from-violet-500/80 to-teal-500/80"
              title="Bill Forwarding"
              description="Forward bills directly to your Duezo address"
              index={0}
            />

            {isLoadingInbox ? (
              <div className="animate-pulse space-y-3">
                <div className="h-24 bg-white/[0.02] rounded-2xl" />
              </div>
            ) : (
              <div className="space-y-4">
                <InboxAddress
                  inboxAddress={inboxAddress}
                  onInboxCreated={(address) => {
                    setInboxAddress(address);
                    setInboxData({ bills_received: 0 });
                  }}
                />

                {inboxAddress && inboxData && (
                  <>
                    {/* Stats row */}
                    {(inboxData.bills_received !== undefined && inboxData.bills_received > 0) && (
                      <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-400">
                            <span className="text-white font-medium">{inboxData.bills_received}</span> bill{inboxData.bills_received !== 1 ? 's' : ''} received
                          </span>
                        </div>
                        {inboxData.last_bill_at && (
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-zinc-500" />
                            <span className="text-sm text-zinc-400">
                              Last: {new Date(inboxData.last_bill_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Waiting state — show when no bills received yet */}
                    {(!inboxData.bills_received || inboxData.bills_received === 0) && (
                      <BillWaiting active={true} />
                    )}

                    {/* Setup guide toggle */}
                    <button
                      onClick={() => setShowSetupGuide(!showSetupGuide)}
                      className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{showSetupGuide ? 'Hide setup guides' : 'How to set up auto-forwarding'}</span>
                    </button>

                    {showSetupGuide && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <SetupGuide inboxAddress={inboxAddress} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          {/* Email Connection */}
          <section>
            <SectionHeader
              icon={Mail}
              iconGradient="from-violet-500/80 to-blue-500/80"
              title="Email Connection"
              description="Automatically detect bills from your inbox"
              index={0}
            />

            <div
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
            >
              {/* Subtle background pattern */}
              <div className="absolute inset-0 bg-white/[0.01]" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAxKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

              <div className="relative p-6">
                {!emailConnection ? (
                  <>
                    <div className="flex items-start gap-5 mb-6">
                      <div className="pt-1">
                        <h3 className="font-semibold text-white tracking-wide mb-1">
                          Choose an email provider
                        </h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                          We&apos;ll scan your inbox for bill-related emails and automatically
                          extract due dates, amounts, and payee information using AI.
                        </p>
                      </div>
                    </div>

                    {/* Privacy notice with decorative border */}
                    <div className="relative p-5 rounded-xl bg-violet-500/[0.03] border border-violet-500/10 mb-6">
                      {/* Corner accents */}
                      <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-violet-400/30 rounded-tl-sm" />
                      <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-violet-400/30 rounded-tr-sm" />
                      <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-violet-400/30 rounded-bl-sm" />
                      <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-violet-400/30 rounded-br-sm" />

                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <Shield className="w-4 h-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-violet-300 mb-2 tracking-wide">
                            Your privacy is protected
                          </p>
                          <ul className="text-sm text-zinc-400 space-y-1.5">
                            <li className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-violet-400/60" />
                              Read-only access to emails
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-violet-400/60" />
                              Only bill-related emails are processed
                            </li>
                            <li className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-violet-400/60" />
                              You can disconnect anytime
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {EMAIL_PROVIDERS.map((provider) => (
                        <button
                          key={provider.name}
                          onClick={() => handleConnectProvider(provider.name)}
                          className={`group relative w-full overflow-hidden rounded-2xl transition-all duration-300 border ${provider.borderColor} ${provider.bgTint}`}
                        >
                          {/* Glow on hover */}
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{ background: `radial-gradient(ellipse at 20% 50%, ${provider.glowColor}, transparent 70%)` }}
                          />

                          <div className="relative flex items-center gap-4 px-5 py-5">
                            {/* Logo container with brand-tinted background */}
                            <div
                              className="relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
                              style={{ backgroundColor: `${provider.color}15` }}
                            >
                              <Image
                                src={provider.logo}
                                alt={provider.label}
                                width={36}
                                height={36}
                                className="object-contain drop-shadow-sm"
                              />
                            </div>

                            {/* Text */}
                            <div className="flex-1 text-left">
                              <p className="text-base text-white font-semibold tracking-wide">
                                {provider.label}
                              </p>
                              <p className="text-sm text-zinc-400 mt-0.5">
                                {provider.description}
                              </p>
                            </div>

                            {/* Connect pill */}
                            <div
                              className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold text-white/80 group-hover:text-white transition-colors duration-200"
                              style={{ backgroundColor: `${provider.color}25`, border: `1px solid ${provider.color}40` }}
                            >
                              Connect
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedProvider === 'yahoo' && (
                      <form
                        onSubmit={handleYahooPasswordConnect}
                        className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-5"
                      >
                        <div className="flex items-start justify-between gap-4 mb-5">
                          <div>
                            <h4 className="text-white font-semibold tracking-wide">Connect Yahoo with an app password</h4>
                            <p className="text-sm text-zinc-400 mt-1">
                              Yahoo OAuth is unavailable, so this uses secure IMAP login with your Yahoo-generated app password.
                            </p>
                          </div>
                          <Link
                            href="https://help.yahoo.com/kb/generate-manage-third-party-passwords-sln15241.html"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-purple-300 hover:text-purple-200 transition-colors"
                          >
                            <span>How to generate one</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block">
                            <span className="block text-sm font-medium text-zinc-300 mb-2">Yahoo email</span>
                            <input
                              type="email"
                              value={yahooEmail}
                              onChange={(e) => setYahooEmail(e.target.value)}
                              placeholder="you@yahoo.com"
                              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                              autoComplete="email"
                              required
                            />
                          </label>
                          <label className="block">
                            <span className="block text-sm font-medium text-zinc-300 mb-2">App password</span>
                            <input
                              type="password"
                              value={yahooAppPassword}
                              onChange={(e) => setYahooAppPassword(e.target.value)}
                              placeholder="16-character app password"
                              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                              autoComplete="current-password"
                              required
                            />
                          </label>
                        </div>

                        <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                          <p className="text-xs text-zinc-500">
                            The app password is stored in your existing email connection record and used only for Yahoo IMAP sync.
                          </p>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProvider(null);
                                setYahooAppPassword('');
                              }}
                              className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isConnectingYahoo}
                              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/80 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-60"
                            >
                              {isConnectingYahoo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                              <span>{isConnectingYahoo ? 'Connecting...' : 'Connect Yahoo Mail'}</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="absolute inset-0 bg-emerald-400/30 rounded-2xl blur-xl" />
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Check className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white tracking-wide text-sm sm:text-base truncate">
                            Connected: {getProviderLabel(emailConnection.provider)} ({emailConnection.email})
                          </p>
                          <p className="text-xs sm:text-sm text-zinc-500">
                            {getProviderLabel(emailConnection.provider)} connected and syncing
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                          Active
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:gap-3">
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="group relative flex-1 flex items-center justify-center gap-2 px-3 sm:px-5 py-3 sm:py-3.5 overflow-hidden rounded-xl font-medium transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-violet-500" />
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                        <Sparkles className="w-4 h-4 text-white relative z-10 flex-shrink-0" />
                        <span className="relative z-10 text-white font-semibold text-sm sm:text-base whitespace-nowrap">
                          Import Bills
                        </span>
                      </button>
                      <button
                        onClick={handleDisconnectEmail}
                        className="px-3 sm:px-5 py-3 sm:py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-zinc-400 hover:text-white font-medium rounded-xl transition-all duration-300 text-sm sm:text-base"
                      >
                        Disconnect
                      </button>
                    </div>

                    {/* Force Rescan Section */}
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      {!showForceRescanConfirm ? (
                        <button
                          onClick={() => setShowForceRescanConfirm(true)}
                          disabled={isForceRescanning}
                          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <RefreshCw className={cn("w-4 h-4", isForceRescanning && "animate-spin")} />
                          <span>No bills found? Force rescan all emails</span>
                        </button>
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/20">
                          <div className="flex items-start gap-3 mb-3">
                            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-amber-200 font-medium">Force Rescan</p>
                              <p className="text-xs text-zinc-400 mt-1">
                                This will clear all previously processed emails (except accepted bills)
                                and rescan everything. Use this if bills aren&apos;t appearing after the normal scan.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleForceRescan}
                              disabled={isForceRescanning}
                              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-sm font-medium text-amber-200 transition-colors"
                            >
                              {isForceRescanning ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Rescanning...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4" />
                                  Rescan All
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => setShowForceRescanConfirm(false)}
                              disabled={isForceRescanning}
                              className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

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

      {/* Bill Import Modal */}
      <BillImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportBills}
      />

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
