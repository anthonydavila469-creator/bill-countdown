'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Check, Crown, Shield, Zap, Sparkles } from 'lucide-react';
import { useStoreKit } from '@/hooks/use-storekit';
import { useSubscription } from '@/hooks/use-subscription';
import { IAP_PRODUCTS, type IAPProductId } from '@/lib/storekit';
import { cn } from '@/lib/utils';

interface PaywallProps {
  isOpen: boolean;
  onClose: () => void;
  triggerFeature?: string;
}

const PRO_FEATURES = [
  { icon: Zap, label: 'Unlimited bills', description: 'No cap on tracking' },
  { icon: Shield, label: 'Multiple reminders', description: 'Never miss a due date' },
  { icon: Sparkles, label: 'All widgets', description: 'Home screen at a glance' },
  { icon: Crown, label: 'Categories & themes', description: 'Make it yours' },
  { icon: Shield, label: 'Payment history', description: 'Full audit trail' },
  { icon: Zap, label: 'Export data', description: 'CSV & PDF reports' },
];

export function Paywall({ isOpen, onClose, triggerFeature }: PaywallProps) {
  const { purchase, restore, isLoading: storeKitLoading } = useStoreKit();
  const { refreshSubscription } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<IAPProductId>(IAP_PRODUCTS.YEARLY);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Entrance animation
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setMounted(true));
      document.body.style.overflow = 'hidden';
    } else {
      setMounted(false);
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPurchasing) onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isPurchasing]);

  const handlePurchase = useCallback(async () => {
    setIsPurchasing(true);
    setError(null);
    try {
      const result = await purchase(selectedPlan);
      if (result.success) {
        await refreshSubscription();
        onClose();
      } else if (result.error && !result.error.includes('cancel')) {
        setError(result.error);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  }, [purchase, selectedPlan, refreshSubscription, onClose]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    setError(null);
    try {
      const result = await restore();
      if (result.success && result.restoredProductIds.length > 0) {
        await refreshSubscription();
        onClose();
      } else {
        setError('No purchases found to restore.');
      }
    } catch {
      setError('Could not restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }, [restore, refreshSubscription, onClose]);

  if (!isOpen) return null;

  const busy = isPurchasing || isRestoring || storeKitLoading;
  const isAnnual = selectedPlan === IAP_PRODUCTS.YEARLY;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
        onClick={busy ? undefined : onClose}
      />

      {/* Ambient glow orbs */}
      <div className={cn(
        'absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none transition-opacity duration-1000',
        mounted ? 'opacity-100' : 'opacity-0'
      )}
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, rgba(109,40,217,0.08) 60%, transparent 100%)' }}
      />
      <div className={cn(
        'absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-1000 delay-200',
        mounted ? 'opacity-60' : 'opacity-0'
      )}
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)' }}
      />

      {/* Content */}
      <div
        className="absolute inset-0 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex min-h-full items-start justify-center px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:items-center sm:py-8">
          <div
            className={cn(
              'relative w-full max-w-md transition-all duration-500',
              mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            {!busy && (
              <button
                onClick={onClose}
                className="absolute -top-1 right-0 z-10 p-2.5 text-zinc-500 hover:text-white transition-colors rounded-xl hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Crown header */}
            <div className="text-center mb-6 pt-2">
              <div className={cn(
                'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-700 delay-200',
                mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              )}
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(168,85,247,0.15) 100%)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 40px rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                <Crown className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className={cn(
                'text-2xl font-bold text-white mb-1.5 tracking-tight transition-all duration-500 delay-300',
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}>
                Unlock Duezo Pro
              </h2>
              <p className={cn(
                'text-sm text-zinc-400 transition-all duration-500 delay-400',
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}>
                {triggerFeature
                  ? `${triggerFeature} is a Pro feature`
                  : 'Take full control of your bills'}
              </p>
            </div>

            {/* Pricing cards */}
            <div className={cn(
              'grid grid-cols-2 gap-3 mb-6 transition-all duration-500 delay-[450ms]',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            )}>
              {/* Monthly */}
              <button
                onClick={() => !busy && setSelectedPlan(IAP_PRODUCTS.MONTHLY)}
                disabled={busy}
                className={cn(
                  'relative rounded-2xl p-4 text-left transition-all duration-300',
                  selectedPlan === IAP_PRODUCTS.MONTHLY
                    ? 'bg-white/[0.06] border-violet-500/40 scale-[1.02]'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]',
                  'border'
                )}
                style={selectedPlan === IAP_PRODUCTS.MONTHLY ? {
                  boxShadow: '0 0 20px rgba(139,92,246,0.1)',
                } : undefined}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 mb-3 flex items-center justify-center transition-all duration-200',
                  selectedPlan === IAP_PRODUCTS.MONTHLY
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-zinc-600'
                )}>
                  {selectedPlan === IAP_PRODUCTS.MONTHLY && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <p className="text-white font-semibold text-sm">Monthly</p>
                <p className="text-xl font-bold text-white mt-1">$3.99</p>
                <p className="text-xs text-zinc-500 mt-0.5">per month</p>
              </button>

              {/* Annual — featured */}
              <button
                onClick={() => !busy && setSelectedPlan(IAP_PRODUCTS.YEARLY)}
                disabled={busy}
                className={cn(
                  'relative rounded-2xl p-4 text-left transition-all duration-300',
                  selectedPlan === IAP_PRODUCTS.YEARLY
                    ? 'bg-violet-500/[0.12] border-violet-500/50 scale-[1.02]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]',
                  'border'
                )}
                style={selectedPlan === IAP_PRODUCTS.YEARLY ? {
                  boxShadow: '0 0 30px rgba(139,92,246,0.15), 0 0 60px rgba(139,92,246,0.05)',
                } : undefined}
              >
                {/* Badges */}
                <div className="absolute -top-2.5 left-3 flex gap-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-violet-500 text-white rounded-full shadow-lg shadow-violet-500/30">
                    Save 58%
                  </span>
                </div>

                <div className={cn(
                  'w-4 h-4 rounded-full border-2 mb-3 flex items-center justify-center transition-all duration-200',
                  selectedPlan === IAP_PRODUCTS.YEARLY
                    ? 'border-violet-500 bg-violet-500'
                    : 'border-zinc-600'
                )}>
                  {selectedPlan === IAP_PRODUCTS.YEARLY && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <p className="text-white font-semibold text-sm">Annual</p>
                <p className="text-xl font-bold text-white mt-1">$19.99</p>
                <p className="text-xs text-zinc-500 mt-0.5">per year</p>
                <p className="text-[10px] font-semibold text-violet-400 mt-1.5 uppercase tracking-wide">
                  7-day free trial
                </p>
              </button>
            </div>

            {/* Features list */}
            <div className={cn(
              'rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 mb-5 transition-all duration-500 delay-500',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            )}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                Everything in Pro
              </p>
              <div className="space-y-3">
                {PRO_FEATURES.map((feature, i) => (
                  <div
                    key={feature.label}
                    className={cn(
                      'flex items-center gap-3 transition-all duration-300',
                      mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    )}
                    style={{ transitionDelay: `${550 + i * 50}ms` }}
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-500/[0.12] border border-violet-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{feature.label}</p>
                      <p className="text-xs text-zinc-500">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}

            {/* CTA button */}
            <div className={cn(
              'transition-all duration-500 delay-700',
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            )}>
              <button
                onClick={handlePurchase}
                disabled={busy}
                className={cn(
                  'w-full py-4 rounded-2xl font-bold text-base text-white transition-all duration-300',
                  busy
                    ? 'opacity-60 cursor-not-allowed'
                    : 'hover:scale-[1.02] active:scale-[0.98]'
                )}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
                  boxShadow: '0 4px 24px rgba(139,92,246,0.4), 0 0 60px rgba(139,92,246,0.1)',
                }}
              >
                {isPurchasing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : isAnnual ? (
                  'Start Free Trial'
                ) : (
                  'Subscribe Now'
                )}
              </button>

              {/* Bottom links */}
              <div className="flex items-center justify-between mt-4 px-1">
                <button
                  onClick={busy ? undefined : onClose}
                  disabled={busy}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Continue with Free
                </button>
                <button
                  onClick={handleRestore}
                  disabled={busy}
                  className="text-xs text-violet-400/70 hover:text-violet-300 transition-colors"
                >
                  {isRestoring ? 'Restoring...' : 'Restore Purchases'}
                </button>
              </div>

              {/* Legal */}
              <p className="text-[10px] text-zinc-600 text-center mt-4 leading-relaxed px-4">
                {isAnnual
                  ? 'Free trial for 7 days, then $19.99/year. Cancel anytime.'
                  : '$3.99/month. Cancel anytime.'}
                {' '}Payment will be charged to your Apple ID account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
