'use client';

import { useState } from 'react';
import { Crown, Sparkles, Check, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/use-subscription';
import { PRICING, FREE_TIER_LIMITS } from '@/contexts/subscription-context';

// Section header component matching other settings sections
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

export function SubscriptionSection() {
  const {
    isPro,
    subscriptionStatus,
    subscriptionPlan,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    billsUsed,
    gmailSyncsUsed,
    showUpgradeModal,
    isLoading,
  } = useSubscription();

  const [isPortalLoading, setIsPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to open billing portal');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section>
        <SectionHeader
          icon={Crown}
          iconGradient="from-amber-500/80 to-orange-500/80"
          title="Subscription"
          description="Manage your plan and billing"
        />
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      </section>
    );
  }

  // Format period end date
  const periodEndDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <section>
      <SectionHeader
        icon={Crown}
        iconGradient="from-amber-500/80 to-orange-500/80"
        title="Subscription"
        description="Manage your plan and billing"
      />

      <div
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
      >
        {/* Subtle background */}
        <div className="absolute inset-0 bg-white/[0.01]" />

        {isPro ? (
          // Pro subscriber view
          <div className="relative p-6">
            {/* Pro badge and status */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-lg opacity-40" />
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white tracking-wide">Pro Plan</p>
                    {cancelAtPeriodEnd && (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                        Canceling
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 capitalize">
                    {subscriptionPlan} billing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Active
                </span>
              </div>
            </div>

            {/* Billing info */}
            {periodEndDate && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-300">
                      {cancelAtPeriodEnd
                        ? 'Access until'
                        : 'Next billing date'}
                    </p>
                    <p className="text-sm text-zinc-500">{periodEndDate}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Manage subscription button */}
            <button
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
              className="group w-full flex items-center justify-center gap-2.5 px-5 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all duration-300"
            >
              {isPortalLoading ? (
                <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                  <span className="font-medium text-zinc-300 group-hover:text-white tracking-wide transition-colors">
                    Manage Subscription
                  </span>
                </>
              )}
            </button>
          </div>
        ) : (
          // Free tier view
          <div className="relative p-6">
            {/* Current plan info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-zinc-400" />
                </div>
                <div>
                  <p className="font-semibold text-white tracking-wide">Free Plan</p>
                  <p className="text-sm text-zinc-500">Limited features</p>
                </div>
              </div>
            </div>

            {/* Usage stats */}
            <div className="space-y-3 mb-6">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Bills</span>
                  <span className="text-sm font-medium text-white">
                    {billsUsed} / {FREE_TIER_LIMITS.MAX_BILLS}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      billsUsed >= FREE_TIER_LIMITS.MAX_BILLS
                        ? 'bg-red-500'
                        : 'bg-orange-500'
                    )}
                    style={{
                      width: `${Math.min(100, (billsUsed / FREE_TIER_LIMITS.MAX_BILLS) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-400">Gmail Syncs</span>
                  <span className="text-sm font-medium text-white">
                    {gmailSyncsUsed} / {FREE_TIER_LIMITS.MAX_GMAIL_SYNCS}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      gmailSyncsUsed >= FREE_TIER_LIMITS.MAX_GMAIL_SYNCS
                        ? 'bg-red-500'
                        : 'bg-orange-500'
                    )}
                    style={{
                      width: `${Math.min(100, (gmailSyncsUsed / FREE_TIER_LIMITS.MAX_GMAIL_SYNCS) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Pro features preview */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/5 to-amber-500/5 border border-orange-500/10 mb-6">
              <p className="text-sm font-medium text-orange-300 mb-3">
                Unlock with Pro:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  'Unlimited bills',
                  'Unlimited syncs',
                  'Calendar view',
                  'Payment links',
                  'Analytics',
                  'Custom reminders',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-zinc-400">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing options */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-xs text-zinc-500 mb-1">Monthly</p>
                <p className="text-lg font-bold text-white">${PRICING.MONTHLY}<span className="text-sm font-normal text-zinc-500">/mo</span></p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 relative">
                <div className="absolute -top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">
                  SAVE {PRICING.YEARLY_SAVINGS}%
                </div>
                <p className="text-xs text-zinc-500 mb-1">Yearly</p>
                <p className="text-lg font-bold text-white">${PRICING.YEARLY}<span className="text-sm font-normal text-zinc-500">/yr</span></p>
              </div>
            </div>

            {/* Upgrade button */}
            <button
              onClick={() => showUpgradeModal('Pro features')}
              className="group relative w-full flex items-center justify-center gap-2.5 px-5 py-4 overflow-hidden rounded-xl font-medium transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600" />
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
              <Crown className="w-5 h-5 text-white relative z-10" />
              <span className="relative z-10 text-white font-semibold tracking-wide">
                Upgrade to Pro
              </span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
