'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  DollarSign,
  Clock,
  ChevronDown,
  Banknote,
} from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { PaycheckSettings, PaySchedule, DEFAULT_PAYCHECK_SETTINGS } from '@/types';
import { cn } from '@/lib/utils';

const SCHEDULE_OPTIONS: { value: PaySchedule; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

function getTodayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Section header with gradient icon
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

// Premium toggle switch
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
      style={enabled ? { backgroundColor: '#10b981' } : undefined}
    >
      {enabled && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-50"
          style={{ backgroundColor: '#10b981' }}
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

export function PaycheckSection() {
  const { paycheckSettings, updatePaycheckSettings } = useTheme();
  const [localSettings, setLocalSettings] = useState<PaycheckSettings>(
    paycheckSettings ?? DEFAULT_PAYCHECK_SETTINGS
  );
  const [amountInput, setAmountInput] = useState(
    localSettings.amount !== null ? localSettings.amount.toString() : ''
  );

  // Sync local state when context changes
  useEffect(() => {
    if (paycheckSettings) {
      setLocalSettings(paycheckSettings);
      setAmountInput(
        paycheckSettings.amount !== null ? paycheckSettings.amount.toString() : ''
      );
    }
  }, [paycheckSettings]);

  const handleToggle = async (enabled: boolean) => {
    const newSettings: PaycheckSettings = {
      ...localSettings,
      enabled,
      next_payday: enabled && !localSettings.next_payday ? getTodayYmd() : localSettings.next_payday,
    };
    setLocalSettings(newSettings);
    await updatePaycheckSettings(newSettings);
  };

  const handleScheduleChange = async (schedule: PaySchedule) => {
    const newSettings: PaycheckSettings = { ...localSettings, schedule };
    setLocalSettings(newSettings);
    await updatePaycheckSettings(newSettings);
  };

  const handleDateChange = async (date: string) => {
    const newSettings: PaycheckSettings = { ...localSettings, next_payday: date };
    setLocalSettings(newSettings);
    await updatePaycheckSettings(newSettings);
  };

  const handleAmountBlur = async () => {
    const trimmed = amountInput.trim();
    let amount: number | null = null;
    if (trimmed) {
      const parsed = parseFloat(trimmed.replace(/[$,]/g, ''));
      if (Number.isFinite(parsed) && parsed > 0) {
        amount = parsed;
      }
    }

    if (amount !== localSettings.amount) {
      const newSettings: PaycheckSettings = { ...localSettings, amount };
      setLocalSettings(newSettings);
      await updatePaycheckSettings(newSettings);
    }

    // Format display
    setAmountInput(amount !== null ? amount.toFixed(2) : '');
  };

  return (
    <section>
      <SectionHeader
        icon={Wallet}
        iconGradient="from-emerald-500/80 to-green-500/80"
        title="Paycheck Mode"
        description="See bills due before your next payday"
        action={
          <PremiumToggle
            enabled={localSettings.enabled}
            onChange={handleToggle}
          />
        }
        index={0}
      />

      {/* Settings panel with slide animation */}
      <div
        className={cn(
          'grid transition-all duration-500 ease-out',
          localSettings.enabled
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 pt-1">
            {/* Pay Schedule */}
            <FieldRow
              icon={Clock}
              label="Pay Schedule"
              description="How often you get paid"
              index={0}
            >
              <div className="relative">
                <select
                  value={localSettings.schedule}
                  onChange={(e) => handleScheduleChange(e.target.value as PaySchedule)}
                  className={cn(
                    'appearance-none pl-4 pr-10 py-2.5 min-w-[160px]',
                    'bg-white/[0.04] hover:bg-white/[0.08]',
                    'border border-white/[0.08] hover:border-white/[0.15]',
                    'rounded-xl text-white text-sm font-medium tracking-wide',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
                    'cursor-pointer transition-all duration-200'
                  )}
                >
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </FieldRow>

            {/* Next Payday */}
            <FieldRow
              icon={Calendar}
              label="Next Payday"
              description="Date of your next paycheck"
              index={1}
            >
              <input
                type="date"
                value={localSettings.next_payday}
                onChange={(e) => handleDateChange(e.target.value)}
                className={cn(
                  'px-4 py-2.5 min-w-[160px]',
                  'bg-white/[0.04] hover:bg-white/[0.08]',
                  'border border-white/[0.08] hover:border-white/[0.15]',
                  'rounded-xl text-white text-sm font-medium tracking-wide',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
                  'cursor-pointer transition-all duration-200',
                  '[color-scheme:dark]'
                )}
              />
            </FieldRow>

            {/* Paycheck Amount */}
            <FieldRow
              icon={Banknote}
              label="Paycheck Amount"
              description="Optional - shows money remaining"
              index={2}
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  onBlur={handleAmountBlur}
                  placeholder="0.00"
                  className={cn(
                    'pl-7 pr-4 py-2.5 w-[140px]',
                    'bg-white/[0.04] hover:bg-white/[0.08]',
                    'border border-white/[0.08] hover:border-white/[0.15]',
                    'rounded-xl text-white text-sm font-medium tracking-wide',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
                    'placeholder:text-zinc-600 transition-all duration-200'
                  )}
                />
              </div>
            </FieldRow>

            {/* Helpful tip */}
            <div
              className="relative p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: '225ms', animationFillMode: 'backwards' }}
            >
              {/* Corner accents */}
              <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-emerald-400/30 rounded-tl-sm" />
              <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-emerald-400/30 rounded-tr-sm" />
              <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-emerald-400/30 rounded-bl-sm" />
              <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-emerald-400/30 rounded-br-sm" />

              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-emerald-300/90 font-medium mb-1">
                    How it works
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Paycheck Mode groups your bills by when they&apos;re due relative to your payday.
                    Add your paycheck amount to see how much money remains after paying upcoming bills.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
