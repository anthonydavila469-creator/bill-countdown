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
  Check,
  Loader2,
} from 'lucide-react';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { createClient } from '@/lib/supabase/client';

// Get auth token — tries getSession first, falls back to getUser + session refresh
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  
  // Try getSession first
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  
  // Session might be stale in Capacitor — try refreshing
  const { data: refreshed } = await supabase.auth.refreshSession();
  if (refreshed?.session?.access_token) return refreshed.session.access_token;
  
  return null;
}

const REMINDER_OPTIONS = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 7, label: '7 days before' },
];

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
  color = '#8B5CF6',
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-14 h-8 rounded-full transition-all duration-300',
        !enabled && 'bg-white/10'
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
  const { isSupported, subscribe, unsubscribe } = usePushNotifications();
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load via API route with Bearer token (works in Capacitor + web)
  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAuthToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const res = await fetch('/api/preferences', { headers });
        if (!res.ok) { setIsLoading(false); return; }

        const data = await res.json();
        if (data?.notification_settings) {
          const raw = data.notification_settings as Partial<NotificationSettings>;
          setSettings({
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...raw,
            reminder_days: Array.isArray(raw.reminder_days) ? raw.reminder_days : [raw.lead_days ?? 3],
          });
        }
      } catch (err) {
        console.error('Failed to load notification settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Save via API route with Bearer token + fallback to direct Supabase
  const save = useCallback(async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    setSaveStatus('saving');

    try {
      const token = await getAuthToken();
      
      // Try API route first
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ notification_settings: newSettings }),
      });

      if (res.ok) {
        setSaveStatus('saved');
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
        return;
      }

      // API route failed — fall back to direct Supabase client write
      console.warn('API save failed, trying direct Supabase write...');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found for direct write either');
        setSaveStatus('error');
        return;
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_settings: newSettings,
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Direct save also failed:', error);
        setSaveStatus('error');
        return;
      }

      setSaveStatus('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    }
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
        {/* Save status */}
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
          <div className="text-xs text-red-400 px-1">Failed to save — try again</div>
        )}

        {/* Email Reminders */}
        <FieldRow icon={Mail} label="Email Reminders" description="Receive bill reminders via email">
          <Toggle enabled={settings.email_enabled} onChange={(v) => save({ ...settings, email_enabled: v })} color="#8B5CF6" />
        </FieldRow>

        {/* Push Notifications */}
        <FieldRow icon={Smartphone} label="Push Notifications" description="Get notified when bills are due">
          <Toggle
            enabled={settings.push_enabled}
            onChange={async (enabled) => {
              if (isSupported && enabled) await subscribe();
              else if (isSupported && !enabled) await unsubscribe();
              save({ ...settings, push_enabled: enabled });
            }}
            color="#8b5cf6"
          />
        </FieldRow>

        {/* Auto-Sync */}
        <FieldRow icon={RefreshCw} label="Auto-Sync Bills" description="Automatically scan for bills daily">
          <Toggle enabled={settings.auto_sync_enabled ?? false} onChange={(v) => save({ ...settings, auto_sync_enabled: v })} color="#10b981" />
        </FieldRow>

        {/* Remind Me — Simple Dropdown */}
        <FieldRow icon={Clock} label="Remind Me" description="When to remind before due date">
          <div className="relative">
            <select
              value={currentReminderDay}
              onChange={(e) => {
                const day = Number(e.target.value);
                save({ ...settings, reminder_days: [day], lead_days: day });
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
        <div className="relative p-4 rounded-xl bg-violet-500/[0.03] border border-violet-500/10">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Info className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Reminders are sent at 9 AM in your timezone. Push notifications require device permission.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
