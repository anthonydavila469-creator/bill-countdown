'use client';

import Link from 'next/link';
import { useSubscriptionContext } from '@/contexts/subscription-context';

export function TrialBanner() {
  const {
    isTrialing,
    trialDaysLeft,
    trialEndsAt,
    isPro,
    subscriptionStatus,
    isLoading,
    upgradeCtasEnabled,
  } = useSubscriptionContext();

  if (isLoading) return null;

  // Already a paid subscriber — no banner
  if (subscriptionStatus === 'active') return null;

  // Active trial
  if (isTrialing) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 px-3 py-1 text-violet-300">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Pro Trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
        </span>
        {upgradeCtasEnabled && (
          <Link
            href="/dashboard/settings#subscription"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            Upgrade
          </Link>
        )}
      </div>
    );
  }

  // Trial expired, not subscribed
  if (trialEndsAt && !isPro) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-3 py-1 text-orange-300">
          Trial ended
        </span>
        {upgradeCtasEnabled && (
          <Link
            href="/dashboard/settings#subscription"
            className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>
    );
  }

  return null;
}
