'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  ChevronDown,
  Info,
  RefreshCw,
} from 'lucide-react';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { createClient } from '@/lib/supabase/client';

const REMINDER_OPTIONS = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
];

// Section header with gradient icon
function SectionHeader({
  icon: Icon,
  iconGradient,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconGradient: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between mb-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
    </div>
  );
}

// Toggle switch component
function Toggle({
  enabled,
  onChange,
  disabled = false,
  color = '#8B5CF6',
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  color?: string;
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
      style={enabled ? { backgroundColor: color } : undefined}
    >
      {enabled && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-50"
          style={{ backgroundColor: color }}
        />
      )}
      <div
        className={cn(
          'absolute top-1 w-6 h-6 rounded-full transition-all duration-300',
          'bg-white shadow-lg',
          enabled ? 'left-7' : 'left-1'
        )}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-zinc-200" />
      </div>
    </button>
  );
}

// Field row wrapper
function FieldRow({
  icon: Icon,
  label,
  description,
  children,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  children: React.ReactNode;
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
          {description && <p className="text-sm text-zinc-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function NotificationSection() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const { isSupported, subscribe, unsubscribe } = usePushNotifications();
  const supabaseRef = useRef(createClient());

  // Get auth headers for Capacitor webview (cookies don't always work)
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const { data: { session } } = await supabaseRef.current.auth.getSession();
      if (session?.access_token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        };
      }
    } catch {}
    return { 'Content-Type': 'application/json' };
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/notifications/settings?t=${Date.now()}`, {
          cache: 'no-store',
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch notification settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [getAuthHeaders]);

  const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
    // Update UI immediately
    setSettings(newSettings);
    // Save to server with auth token
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/notifications/settings?t=${Date.now()}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(newSettings),
        cache: 'no-store',
      });
      if (res.ok) {
        const saved = await res.json();
        setSettings(saved);
      } else {
        console.error('Failed to save notification settings:', res.status);
      }
    } catch (err) {
      console.error('Failed to save notification settings:', err);
    }
  }, [getAuthHeaders]);

  if (isLoading) {
    return (
      <section>
        <SectionHeader
          icon={Bell}
          iconGradient="from-violet-500/80 to-amber-500/80"
          title="Notifications"
          description="Get reminded about upcoming bills"
        />
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-white/[0.02] rounded-2xl" />
          <div className="h-16 bg-white/[0.02] rounded-2xl" />
        </div>
      </section>
    );
  }

  const currentReminderDay = settings.reminder_days?.[0] ?? settings.lead_days ?? 3;

  return (
    <section>
      <SectionHeader
        icon={Bell}
        iconGradient="from-violet-500/80 to-amber-500/80"
        title="Notifications"
        description="Get reminded about upcoming bills"
      />

      <div className="space-y-3">
        {/* Email Reminders */}
        <FieldRow icon={Mail} label="Email Reminders" description="Receive bill reminders via email" index={0}>
          <Toggle
            enabled={settings.email_enabled}
            onChange={(v) => saveSettings({ ...settings, email_enabled: v })}
            color="#8B5CF6"
          />
        </FieldRow>

        {/* Push Notifications */}
        <FieldRow icon={Smartphone} label="Push Notifications" description="Get notified when bills are due" index={1}>
          <Toggle
            enabled={settings.push_enabled}
            onChange={async (enabled) => {
              if (isSupported && enabled) {
                await subscribe();
              } else if (isSupported && !enabled) {
                await unsubscribe();
              }
              saveSettings({ ...settings, push_enabled: enabled });
            }}
            color="#8b5cf6"
          />
        </FieldRow>

        {/* Auto-Sync */}
        <FieldRow icon={RefreshCw} label="Auto-Sync Bills" description="Automatically scan for bills daily" index={2}>
          <Toggle
            enabled={settings.auto_sync_enabled ?? false}
            onChange={(v) => saveSettings({ ...settings, auto_sync_enabled: v })}
            color="#10b981"
          />
        </FieldRow>

        {/* Remind Me — Simple Dropdown */}
        <FieldRow icon={Clock} label="Remind Me" description="When to remind before due date" index={3}>
          <div className="relative">
            <select
              value={currentReminderDay}
              onChange={(e) => {
                const day = Number(e.target.value);
                saveSettings({
                  ...settings,
                  reminder_days: [day],
                  lead_days: day,
                });
              }}
              className={cn(
                'appearance-none pl-4 pr-10 py-2.5 min-w-[160px]',
                'bg-white/[0.04] hover:bg-white/[0.08]',
                'border border-white/[0.08] hover:border-white/[0.15]',
                'rounded-xl text-white text-sm font-medium tracking-wide',
                'focus:outline-none focus:ring-2 focus:ring-violet-500/30',
                'cursor-pointer transition-all duration-200'
              )}
            >
              {REMINDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          </div>
        </FieldRow>

        {/* Info */}
        <div className="relative p-4 rounded-xl bg-violet-500/[0.03] border border-violet-500/10 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Info className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Reminders are sent at 9 AM in your timezone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
