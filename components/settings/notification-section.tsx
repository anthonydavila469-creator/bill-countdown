'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  Check,
  Info,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useSubscription } from '@/hooks/use-subscription';

const REMINDER_DAY_OPTIONS = [
  { value: 7, label: '7 days before' },
  { value: 3, label: '3 days before' },
  { value: 1, label: '1 day before' },
  { value: 0, label: 'Day of (AM)' },
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
  color = '#f97316',
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
  const {
    canUsePushNotifications,
    canUseDailyAutoSync,
    canCustomizeReminders,
    showUpgradeModal,
    upgradeCtasEnabled,
  } = useSubscription();

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

  const handleReminderDaysToggle = useCallback(async (day: number) => {
    const current = settings.reminder_days ?? [settings.lead_days];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => b - a);
    // Keep at least one selected
    if (updated.length === 0) return;
    await updateSettings({ ...settings, reminder_days: updated, lead_days: Math.min(...updated) });
  }, [settings, updateSettings]);

  const handleAutoSyncToggle = useCallback(async (enabled: boolean) => {
    await updateSettings({ ...settings, auto_sync_enabled: enabled });
  }, [settings, updateSettings]);

  if (isLoading) {
    return (
      <section>
        <SectionHeader
          icon={Bell}
          iconGradient="from-orange-500/80 to-amber-500/80"
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
        iconGradient="from-orange-500/80 to-amber-500/80"
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
            color="#f97316"
          />
        </FieldRow>

        {/* Push Notifications - Pro Feature */}
        <FieldRow
          icon={Smartphone}
          label="Push Notifications"
          description={!isSupported ? 'Not supported on this device' : 'Get notified when bills are due'}
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
                  if (upgradeCtasEnabled) {
                    showUpgradeModal('push notifications');
                  }
                  return;
                }
                handlePushToggle(enabled);
              }}
              disabled={!isSupported || (!canUsePushNotifications && !upgradeCtasEnabled)}
              color="#f59e0b"
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
                  if (upgradeCtasEnabled) {
                    showUpgradeModal('daily auto-sync');
                  }
                  return;
                }
                handleAutoSyncToggle(enabled);
              }}
              disabled={!canUseDailyAutoSync && !upgradeCtasEnabled}
              color="#10b981"
            />
          </div>
        </FieldRow>

        {/* Reminder Timing - Multi-select - Pro Feature */}
        <div
          className="group p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: '225ms', animationFillMode: 'backwards' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
                <Clock className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-white tracking-wide">Reminder Timing</p>
                <p className="text-sm text-zinc-500">When to send reminders</p>
              </div>
            </div>
            {!canCustomizeReminders && (
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <Crown className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-amber-300">Pro</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 ml-14">
            {REMINDER_DAY_OPTIONS.map((opt) => {
              const activeDays = settings.reminder_days ?? [settings.lead_days];
              const isActive = activeDays.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (!canCustomizeReminders) {
                      if (upgradeCtasEnabled) {
                        showUpgradeModal('custom reminders');
                      }
                      return;
                    }
                    handleReminderDaysToggle(opt.value);
                  }}
                  disabled={!canCustomizeReminders && !upgradeCtasEnabled}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 h-11 rounded-xl text-sm font-medium transition-all duration-200 border',
                    isActive
                      ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                      : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.1]',
                    !canCustomizeReminders && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center transition-all',
                      isActive
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-white/20'
                    )}
                  >
                    {isActive && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info tip */}
        <div
          className="relative p-4 rounded-xl bg-orange-500/[0.03] border border-orange-500/10 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDelay: '375ms', animationFillMode: 'backwards' }}
        >
          <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-orange-400/30 rounded-tl-sm" />
          <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-orange-400/30 rounded-tr-sm" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-orange-400/30 rounded-bl-sm" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-orange-400/30 rounded-br-sm" />

          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <Info className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-orange-300/90 font-medium mb-1">
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
