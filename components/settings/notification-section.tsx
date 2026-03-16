'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  Clock,
  ChevronDown,
  Info,
  RefreshCw,
  Check,
  Loader2,
  Mail,
  Smartphone,
} from 'lucide-react';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { usePushNotifications } from '@/hooks/use-push-notifications';

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed?.session?.access_token) return refreshed.session.access_token;

  return null;
}

const REMINDER_OPTIONS = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
];

function reminderPreferenceFromDay(day: number): NotificationSettings['remind_me'] {
  switch (day) {
    case 1:
      return '1day';
    case 7:
      return '7days';
    case 3:
    default:
      return '3days';
  }
}

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
    <div className="flex items-center justify-between mb-5">
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
        <div className="absolute inset-0 rounded-full blur-md opacity-50" style={{ backgroundColor: color }} />
      )}
      <div className={cn('absolute top-1 w-6 h-6 rounded-full transition-all duration-300 bg-white shadow-lg', enabled ? 'left-7' : 'left-1')}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-zinc-200" />
      </div>
    </button>
  );
}

function FieldRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300">
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAuthToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`/api/notifications/settings?t=${Date.now()}`, {
          headers,
          cache: 'no-store',
        });
        if (!res.ok) {
          setIsLoading(false);
          return;
        }

        const raw = (await res.json()) as Partial<NotificationSettings>;
        setSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...raw,
          reminder_days: Array.isArray(raw.reminder_days) ? raw.reminder_days : [raw.lead_days ?? 3],
        });
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const save = useCallback(async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    setSaveStatus('saving');

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/notifications/settings?t=${Date.now()}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(newSettings),
      });

      if (!res.ok) {
        throw new Error(`Failed to save notification settings (${res.status})`);
      }

      const savedSettings = (await res.json()) as NotificationSettings;
      setSettings(savedSettings);
      setSaveStatus('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    }
  }, []);

  const handlePushToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const granted = await subscribe();
      if (!granted) {
        setSaveStatus('error');
        return;
      }

      await save({ ...settings, push_enabled: true });
      return;
    }

    await unsubscribe();
    await save({ ...settings, push_enabled: false });
  }, [save, settings, subscribe, unsubscribe]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  if (isLoading) {
    return (
      <section>
        <SectionHeader icon={Bell} iconGradient="from-violet-500/80 to-amber-500/80" title="Notifications" description="Get reminded about upcoming bills" />
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
      <SectionHeader icon={Bell} iconGradient="from-violet-500/80 to-amber-500/80" title="Notifications" description="Get reminded about upcoming bills" />

      <div className="space-y-3">
        {saveStatus === 'saving' && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 px-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving...
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 px-1">
            <Check className="w-3 h-3" /> Saved
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="text-xs text-red-400 px-1">Failed to save. If you were enabling push, check notification permission and try again.</div>
        )}

        <FieldRow icon={RefreshCw} label="Auto-Sync Bills" description="Automatically scan for bills daily">
          <Toggle enabled={settings.auto_sync_enabled ?? false} onChange={(value) => void save({ ...settings, auto_sync_enabled: value })} color="#10b981" />
        </FieldRow>

        <FieldRow icon={Clock} label="Remind Me" description="When to remind before due date">
          <div className="relative">
            <select
              value={currentReminderDay}
              onChange={(e) => {
                const day = Number(e.target.value);
                void save({
                  ...settings,
                  remind_me: reminderPreferenceFromDay(day),
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

        <FieldRow icon={Mail} label="Email Reminders" description="Get email reminders when bills are coming due">
          <Toggle enabled={settings.email_enabled} onChange={(value) => void save({ ...settings, email_enabled: value })} color="#8B5CF6" />
        </FieldRow>

        <FieldRow icon={Smartphone} label="Push Notifications" description="Get push notifications when bills are coming due">
          <Toggle
            enabled={settings.push_enabled && isSubscribed}
            onChange={(value) => void handlePushToggle(value)}
            disabled={!isSupported}
            color="#8B5CF6"
          />
        </FieldRow>

        <div className="relative p-4 rounded-xl bg-violet-500/[0.03] border border-violet-500/10">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Info className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Auto-sync scans your email daily for new bills. Notification delivery follows the channels you enable here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
