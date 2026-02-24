'use client';

import { useState, useEffect } from 'react';
import { X, Check, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/use-subscription';
import { PRICING } from '@/contexts/subscription-context';

// Feature list for Pro tier
const PRO_FEATURES = [
  { label: 'Unlimited bills', description: 'Track all your bills without limits' },
  { label: 'Unlimited Gmail syncs', description: 'Auto-import bills from your inbox' },
  { label: 'Daily auto-sync', description: 'Bills are automatically imported' },
  { label: 'Payment links', description: 'One-click "Pay Now" buttons' },
  { label: 'Calendar view', description: 'See all bills on a calendar' },
  { label: 'Payment history', description: 'Track your payment patterns' },
  { label: 'Analytics & insights', description: 'Understand your spending' },
  { label: 'Variable bill tracking', description: 'Track fluctuating amounts' },
  { label: 'Custom reminders', description: 'Push notifications & quiet hours' },
];

export function UpgradeModal() {
  const { upgradeModalOpen, upgradeModalFeature, hideUpgradeModal, isIosApp } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  useEffect(() => {
    if (isIosApp && upgradeModalOpen) {
      hideUpgradeModal();
    }
  }, [isIosApp, upgradeModalOpen, hideUpgradeModal]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (upgradeModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [upgradeModalOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideUpgradeModal();
    };
    if (upgradeModalOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [upgradeModalOpen, hideUpgradeModal]);

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!upgradeModalOpen || isIosApp) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={hideUpgradeModal}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className={cn(
              'relative w-full max-w-lg bg-[#0c0c10] border border-white/10 rounded-2xl shadow-2xl',
              'animate-in fade-in zoom-in-95 duration-200'
            )}
          >
            {/* Header */}
            <div className="relative p-6 border-b border-white/10">
              <button
                onClick={hideUpgradeModal}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Upgrade to Pro</h2>
              </div>

              {upgradeModalFeature && (
                <p className="text-zinc-400 text-sm">
                  Unlock <span className="text-white font-medium">{upgradeModalFeature}</span> and more with Pro
                </p>
              )}
            </div>

            {/* Pricing Options */}
            <div className="p-6 space-y-4">
              {/* Monthly Option */}
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={cn(
                  'w-full p-4 rounded-xl border-2 transition-all text-left',
                  selectedPlan === 'monthly'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-white/10 hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">Monthly</div>
                    <div className="text-zinc-400 text-sm">Billed monthly</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-xl">${PRICING.MONTHLY}</div>
                    <div className="text-zinc-500 text-sm">/month</div>
                  </div>
                </div>
              </button>

              {/* Yearly Option */}
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={cn(
                  'w-full p-4 rounded-xl border-2 transition-all text-left relative',
                  selectedPlan === 'yearly'
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-white/10 hover:border-white/20'
                )}
              >
                <div className="absolute -top-3 left-4 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                  SAVE {PRICING.YEARLY_SAVINGS}%
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">Yearly</div>
                    <div className="text-zinc-400 text-sm">Billed annually</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold text-xl">${PRICING.YEARLY}</div>
                    <div className="text-zinc-500 text-sm">/year</div>
                  </div>
                </div>
              </button>

              {/* Feature List */}
              <div className="pt-4 border-t border-white/10">
                <div className="text-sm font-medium text-zinc-400 mb-3">Everything in Pro:</div>
                <div className="grid grid-cols-2 gap-2">
                  {PRO_FEATURES.map((feature) => (
                    <div key={feature.label} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-zinc-300">{feature.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Button */}
              <button
                onClick={handleUpgrade}
                disabled={isLoading}
                className={cn(
                  'w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all',
                  'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Upgrade to Pro
                  </>
                )}
              </button>

              <p className="text-center text-xs text-zinc-500">
                Cancel anytime. Secure payment via Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
