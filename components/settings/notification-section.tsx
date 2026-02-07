'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  ChevronDown,
  Info,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useSubscription } from '@/hooks/use-subscription';

const LEAD_TIME_OPTIONS = [
  { value: 0, label: 'Day of' },
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
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconGradient: string;
  title: string;
  description: string;
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
    </div>
  );
}

// Toggle switch component
function Toggle({
  enabled,
  onChange,
  disabled = false,
  color = '#6366f1',
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
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const { canUsePushNotifications, canUseDailyAutoSync, canCustomizeReminders, showUpgradeModal } = useSubscription();

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/notifications/settings');
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
  }, []);

  const updateSettings = useCallback(async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error('Failed to update notification settings:', err);
    }
  }, []);

  const handleEmailToggle = useCallback(async (enabled: boolean) => {
    await updateSettings({ ...settings, email_enabled: enabled });
  }, [settings, updateSettings]);

  const handlePushToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // Request push permission and subscribe
      const success = await subscribe();
      if (success) {
        await updateSettings({ ...settings, push_enabled: true });
      }
    } else {
      // Unsubscribe
      await unsubscribe();
      await updateSettings({ ...settings, push_enabled: false });
    }
  }, [settings, updateSettings, subscribe, unsubscribe]);

  const handleLeadDaysChange = useCallback(async (value: number) => {
    await updateSettings({ ...settings, lead_days: value });
  }, [settings, updateSettings]);

  const handleAutoSyncToggle = useCallback(async (enabled: boolean) => {
    await updateSettings({ ...settings, auto_sync_enabled: enabled });
  }, [settings, updateSettings]);

  if (isLoading) {
    return (
      <section>
        <SectionHeader
          icon={Bell}
          iconGradient="from-indigo-500/80 to-purple-500/80"
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

  return (
    <section>
      <SectionHeader
        icon={Bell}
        iconGradient="from-indigo-500/80 to-purple-500/80"
        title="Notifications"
        description="Get reminded about upcoming bills"
      />

      <div className="space-y-3">
        {/* Email Notifications */}
        <FieldRow
          icon={Mail}
          label="Email Reminders"
          description="Receive bill reminders via email"
          index={0}
        >
          <Toggle
            enabled={settings.email_enabled}
            onChange={handleEmailToggle}
            color="#6366f1"
          />
        </FieldRow>

        {/* Push Notifications - Pro Feature */}
        <FieldRow
          icon={Smartphone}
          label="Push Notifications"
          description={!isSupported ? 'Not supported in this browser' : 'Get notified in your browser'}
          index={1}
        >
          <div className="flex items-center gap-3">
            {!canUsePushNotifications && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Crown className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-300">Pro</span>
              </span>
            )}
            <Toggle
              enabled={settings.push_enabled && isSubscribed && canUsePushNotifications}
              onChange={(enabled) => {
                if (!canUsePushNotifications) {
                  showUpgradeModal('push notifications');
                  return;
                }
                handlePushToggle(enabled);
              }}
              disabled={!isSupported}
              color="#8b5cf6"
            />
          </div>
        </FieldRow>

        {/* Auto-Sync Bills - Pro Feature */}
        <FieldRow
          icon={RefreshCw}
          label="Auto-Sync Bills"
          description="Automatically scan Gmail for bills daily"
          index={2}
        >
          <div className="flex items-center gap-3">
            {!canUseDailyAutoSync && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Crown className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-300">Pro</span>
              </span>
            )}
            <Toggle
              enabled={(settings.auto_sync_enabled ?? false) && canUseDailyAutoSync}
              onChange={(enabled) => {
                if (!canUseDailyAutoSync) {
                  showUpgradeModal('daily auto-sync');
                  return;
                }
                handleAutoSyncToggle(enabled);
              }}
              color="#10b981"
            />
          </div>
        </FieldRow>

        {/* Lead Time - Pro Feature */}
        <FieldRow
          icon={Clock}
          label="Reminder Timing"
          description="When to send reminders"
          index={3}
        >
          <div className="flex items-center gap-3">
            {!canCustomizeReminders && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Crown className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-300">Pro</span>
              </span>
            )}
            <div className="relative">
              <select
                value={settings.lead_days}
                onChange={(e) => {
                  if (!canCustomizeReminders) {
                    showUpgradeModal('custom reminders');
                    return;
                  }
                  handleLeadDaysChange(parseInt(e.target.value));
                }}
                disabled={!canCustomizeReminders}
                className={cn(
                  'appearance-none pl-4 pr-10 py-2.5 min-w-[160px]',
                  'bg-white/[0.04] hover:bg-white/[0.08]',
                  'border border-white/[0.08] hover:border-white/[0.15]',
                  'rounded-xl text-white text-sm font-medium tracking-wide',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
                  'cursor-pointer transition-all duration-200',
                  !canCustomizeReminders && 'opacity-50 cursor-not-allowed'
                )}
              >
                {LEAD_TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </FieldRow>

        {/* Info tip */}
        <div
          className="relative p-4 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/10 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: '375ms', animationFillMode: 'backwards' }}
        >
          <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-indigo-400/30 rounded-tl-sm" />
          <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-indigo-400/30 rounded-tr-sm" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-indigo-400/30 rounded-bl-sm" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-indigo-400/30 rounded-br-sm" />

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/10">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-indigo-300/90 font-medium mb-1">
                About Notifications
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Reminders are sent at 9 AM in your timezone. Push notifications require browser permission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
