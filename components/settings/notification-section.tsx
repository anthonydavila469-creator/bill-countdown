'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

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
  color = '#10b981',
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

export function NotificationSection() {
  const [autoSync, setAutoSync] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useRef(createClient()).current;

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLoading(false); return; }

        const { data } = await supabase
          .from('user_preferences')
          .select('notification_settings')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data?.notification_settings) {
          const raw = data.notification_settings as Partial<NotificationSettings>;
          setAutoSync(raw.auto_sync_enabled ?? true);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [supabase]);

  const toggleAutoSync = useCallback(async (enabled: boolean) => {
    setAutoSync(enabled);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_settings: {
            ...DEFAULT_NOTIFICATION_SETTINGS,
            auto_sync_enabled: enabled,
          },
        }, { onConflict: 'user_id' });
    } catch (err) {
      console.error('Failed to save auto-sync:', err);
    }
  }, [supabase]);

  if (isLoading) {
    return (
      <section>
        <SectionHeader icon={Bell} iconGradient="from-violet-500/80 to-amber-500/80" title="Sync" description="Keep your bills up to date" />
        <div className="animate-pulse h-16 bg-white/[0.02] rounded-2xl" />
      </section>
    );
  }

  return (
    <section>
      <SectionHeader icon={Bell} iconGradient="from-violet-500/80 to-amber-500/80" title="Sync" description="Keep your bills up to date" />

      <div className="group flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <p className="font-medium text-white tracking-wide">Auto-Sync Bills</p>
            <p className="text-sm text-zinc-500">Automatically scan your email for bills daily</p>
          </div>
        </div>
        <Toggle enabled={autoSync} onChange={toggleAutoSync} />
      </div>
    </section>
  );
}
