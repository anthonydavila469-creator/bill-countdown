'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { Crown, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { PRICING } from '@/contexts/subscription-context';
import { cn } from '@/lib/utils';

interface ProFeatureGateProps {
  children: ReactNode;
  feature: string;
  featureName: string;
  featureDescription: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// Features included in Pro
const PRO_FEATURES = [
  'Unlimited bills',
  'Unlimited Gmail syncs',
  'Daily auto-sync',
  'Payment links',
  'Calendar view',
  'Payment history',
  'Analytics & insights',
  'Variable bill tracking',
  'Custom reminders',
];

export function ProFeatureGate({
  children,
  feature,
  featureName,
  featureDescription,
  icon: Icon = Sparkles,
}: ProFeatureGateProps) {
  const [mounted, setMounted] = useState(false);
  const { isPro, showUpgradeModal, isLoading } = useSubscription();

  // Wait for client-side mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Skip loading spinner to prevent flash - just render content
  // The subscription check happens quickly in the background
  if (!mounted) {
    return null;
  }

  // If user is Pro, show the content
  if (isPro) {
    return <>{children}</>;
  }

  // Show upgrade prompt for free users
  return (
    <div className="min-h-screen bg-[#08080c] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c10]">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl" />

          <div className="relative p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                  <Icon className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                {featureName} is a Pro Feature
              </h1>
              <p className="text-zinc-400">
                {featureDescription}
              </p>
            </div>

            {/* Feature list */}
            <div className="mb-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-sm font-medium text-zinc-300 mb-3">
                Everything included in Pro:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PRO_FEATURES.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className={cn(
                      "text-sm",
                      f.toLowerCase().includes(feature.toLowerCase())
                        ? "text-white font-medium"
                        : "text-zinc-300"
                    )}>
                      {f}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <p className="text-xs text-zinc-500 mb-1">Monthly</p>
                <p className="text-lg font-bold text-white">${PRICING.MONTHLY}<span className="text-sm font-normal text-zinc-500">/mo</span></p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center relative">
                <div className="absolute -top-2 right-2 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">
                  SAVE {PRICING.YEARLY_SAVINGS}%
                </div>
                <p className="text-xs text-zinc-500 mb-1">Yearly</p>
                <p className="text-lg font-bold text-white">${PRICING.YEARLY}<span className="text-sm font-normal text-zinc-500">/yr</span></p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => showUpgradeModal(featureName)}
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

            <p className="text-center text-xs text-zinc-500 mt-4">
              Cancel anytime. Secure payment via Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
