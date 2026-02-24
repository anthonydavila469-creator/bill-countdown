'use client';

import { cn } from '@/lib/utils';
import { CreditCard, Wallet, Bell, Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';

export interface SetupOptions {
  autopayTracking: boolean;
  paycheckMode: boolean;
  emailReminders: boolean;
}

interface OptionalSetupProps {
  options: SetupOptions;
  onChange: (options: SetupOptions) => void;
}

export function OptionalSetup({ options, onChange }: OptionalSetupProps) {
  const { canUsePaycheckMode, showUpgradeModal, upgradeCtasEnabled } = useSubscription();

  const toggleOption = (key: keyof SetupOptions) => {
    // If trying to enable paycheck mode and user is not Pro, show upgrade modal
    if (key === 'paycheckMode' && !options.paycheckMode && !canUsePaycheckMode) {
      if (upgradeCtasEnabled) {
        showUpgradeModal('paycheck mode');
      }
      return;
    }

    onChange({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <div className="space-y-4">
      {/* Autopay Tracking */}
      <SetupCard
        icon={CreditCard}
        iconGradient="from-emerald-500 to-green-500"
        title="Autopay Tracking"
        description="Mark bills as autopay to track which ones pay themselves"
        enabled={options.autopayTracking}
        onToggle={() => toggleOption('autopayTracking')}
        index={0}
      />

      {/* Paycheck Mode - Pro feature */}
      <SetupCard
        icon={Wallet}
        iconGradient="from-orange-500 to-orange-500"
        title="Paycheck Mode"
        description="See which bills are due before your next payday"
        enabled={options.paycheckMode && canUsePaycheckMode}
        onToggle={() => toggleOption('paycheckMode')}
        index={1}
        isPro={!canUsePaycheckMode}
      />

      {/* Email Reminders */}
      <SetupCard
        icon={Bell}
        iconGradient="from-amber-500 to-amber-500"
        title="Email Reminders"
        description="Get notified before bills are due"
        enabled={options.emailReminders}
        onToggle={() => toggleOption('emailReminders')}
        index={2}
      />
    </div>
  );
}

interface SetupCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconGradient: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  index: number;
  isPro?: boolean;
}

function SetupCard({
  icon: Icon,
  iconGradient,
  title,
  description,
  enabled,
  onToggle,
  index,
  isPro = false,
}: SetupCardProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'group w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300',
        'border text-left',
        'animate-in fade-in slide-in-from-bottom-4',
        enabled
          ? 'bg-white/[0.04] border-white/20'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.03] hover:border-white/10'
      )}
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: 'backwards',
      }}
    >
      {/* Icon */}
      <div className={cn('relative p-3 rounded-xl bg-gradient-to-br', iconGradient)}>
        <Icon className="w-5 h-5 text-white relative z-10" />
        <div
          className={cn(
            'absolute inset-0 rounded-xl bg-gradient-to-br blur-lg opacity-0 group-hover:opacity-40 transition-opacity',
            iconGradient
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          {isPro && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
              <Crown className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-300">Pro</span>
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 mt-0.5">{description}</p>
      </div>

      {/* Toggle */}
      <div
        className={cn(
          'relative w-12 h-7 rounded-full transition-all duration-300',
          enabled ? 'bg-amber-500' : 'bg-white/10'
        )}
      >
        {enabled && (
          <div className="absolute inset-0 rounded-full bg-amber-500 blur-md opacity-50" />
        )}
        <div
          className={cn(
            'absolute top-1 w-5 h-5 rounded-full transition-all duration-300',
            'bg-white shadow-lg',
            enabled ? 'left-6' : 'left-1'
          )}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white to-zinc-100" />
        </div>
      </div>
    </button>
  );
}
