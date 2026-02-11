'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  Mail,
  Smartphone,
  Clock,
  Globe,
  RefreshCw,
  Check,
  ArrowLeft,
  Loader2,
  Crown,
  Info,
} from 'lucide-react';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useSubscription } from '@/hooks/use-subscription';

const REMINDER_DAY_OPTIONS = [
  { value: 7, label: '7 days before' },
  { value: 3, label: '3 days before' },
  { value: 1, label: '1 day before' },
  { value: 0, label: 'Day of (morning)' },
];

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

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
      />
    </button>
  );
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSettings, setSavedSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const { canUsePushNotifications, canUseDailyAutoSync, canCustomizeReminders, showUpgradeModal } = useSubscription();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/notifications/settings');
        if (res.ok) {
          const data = await res.json();
          // Migrate: ensure reminder_days exists
          if (!data.reminder_days) {
            data.reminder_days = [data.lead_days ?? 3];
          }
          setSettings(data);
          setSavedSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch notification settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Auto-detect timezone on mount
  useEffect(() => {
    if (!isLoading && settings.timezone === 'America/New_York') {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && detected !== settings.timezone) {
        setSettings(prev => ({ ...prev, timezone: detected }));
      }
    }
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(savedSettings));
  }, [settings, savedSettings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSettings(data);
        setSettings(data);
        setHasChanges(false);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const handlePushToggle = useCallback(async (enabled: boolean) => {
    if (!canUsePushNotifications) {
      showUpgradeModal('push notifications');
      return;
    }
    if (enabled) {
      const success = await subscribe();
      if (success) setSettings(prev => ({ ...prev, push_enabled: true }));
    } else {
      await unsubscribe();
      setSettings(prev => ({ ...prev, push_enabled: false }));
    }
  }, [canUsePushNotifications, showUpgradeModal, subscribe, unsubscribe]);

  const toggleReminderDay = (day: number) => {
    if (!canCustomizeReminders) {
      showUpgradeModal('custom reminders');
      return;
    }
    const current = settings.reminder_days ?? [settings.lead_days];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => b - a);
    if (updated.length === 0) return;
    setSettings(prev => ({ ...prev, reminder_days: updated, lead_days: Math.min(...updated) }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard/settings"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Notification Preferences</h1>
            <p className="text-sm text-zinc-500 mt-1">Customize when and how you get reminded</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white/[0.04]">
                <Mail className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-white">Email Notifications</p>
                <p className="text-sm text-zinc-500">Receive bill reminders via email</p>
              </div>
            </div>
            <Toggle
              enabled={settings.email_enabled}
              onChange={(v) => setSettings(prev => ({ ...prev, email_enabled: v }))}
              color="#f97316"
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white/[0.04]">
                <Smartphone className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-white">Push Notifications</p>
                <p className="text-sm text-zinc-500">
                  {!isSupported ? 'Not supported in this browser' : 'Get notified in your browser'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!canUsePushNotifications && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                </span>
              )}
              <Toggle
                enabled={settings.push_enabled && isSubscribed && canUsePushNotifications}
                onChange={handlePushToggle}
                disabled={!isSupported}
                color="#f59e0b"
              />
            </div>
          </div>

          {/* Reminder Timing - Multi-select */}
          <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white/[0.04]">
                  <Clock className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Reminder Timing</p>
                  <p className="text-sm text-zinc-500">When to send reminders before due date</p>
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
                    onClick={() => toggleReminderDay(opt.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border',
                      isActive
                        ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                        : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.1]',
                      !canCustomizeReminders && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-all',
                        isActive ? 'bg-orange-500 border-orange-500' : 'border-white/20'
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

          {/* Timezone */}
          <div className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white/[0.04]">
                <Globe className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-white">Timezone</p>
                <p className="text-sm text-zinc-500">Reminders are sent at 9 AM in your timezone</p>
              </div>
            </div>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="appearance-none px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer transition-all"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-zinc-900 text-white">
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
              {/* Include current timezone if not in common list */}
              {!COMMON_TIMEZONES.includes(settings.timezone) && (
                <option value={settings.timezone} className="bg-zinc-900 text-white">
                  {settings.timezone.replace(/_/g, ' ')}
                </option>
              )}
            </select>
          </div>

          {/* Auto-Sync Gmail */}
          <div className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl transition-all">
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-white/[0.04]">
                <RefreshCw className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-white">Daily Auto-Sync Gmail</p>
                <p className="text-sm text-zinc-500">Automatically scan for new bills daily</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!canUseDailyAutoSync && (
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-300">Pro</span>
                </span>
              )}
              <Toggle
                enabled={(settings.auto_sync_enabled ?? false) && canUseDailyAutoSync}
                onChange={(v) => {
                  if (!canUseDailyAutoSync) {
                    showUpgradeModal('daily auto-sync');
                    return;
                  }
                  setSettings(prev => ({ ...prev, auto_sync_enabled: v }));
                }}
                color="#10b981"
              />
            </div>
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-orange-500/[0.03] border border-orange-500/10">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Info className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Reminders are sent at 9 AM in your timezone. Push notifications require browser permission.
              </p>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={cn(
              'w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200',
              hasChanges
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90 shadow-lg shadow-orange-500/20'
                : 'bg-white/5 text-zinc-600 cursor-not-allowed'
            )}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : hasChanges ? (
              'Save Changes'
            ) : (
              'No Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
