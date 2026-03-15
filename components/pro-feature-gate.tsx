'use client';

import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

interface ProFeatureGateProps {
  children: ReactNode;
  feature: string;
  featureName: string;
  featureDescription: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function ProFeatureGate({
  children,
  feature,
  featureName,
  featureDescription,
  icon: Icon,
}: ProFeatureGateProps) {
  const { isPro, upgradeCtasEnabled, showUpgradeModal } = useSubscription();

  // Pro users see content as-is
  if (isPro) {
    return <>{children}</>;
  }

  // Non-iOS free users: just hide the feature (no paywall on web)
  if (!upgradeCtasEnabled) {
    return null;
  }

  // iOS free users: show locked state with upgrade prompt
  return (
    <button
      onClick={() => showUpgradeModal(featureName)}
      className={cn(
        'relative w-full rounded-2xl p-6 text-left',
        'bg-white/[0.03] border border-white/[0.06]',
        'hover:bg-white/[0.05] transition-all duration-200'
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-500/[0.12] border border-violet-500/20 flex items-center justify-center">
          {Icon ? (
            <Icon className="w-6 h-6 text-violet-400" />
          ) : (
            <Lock className="w-5 h-5 text-violet-400" />
          )}
        </div>
        <div>
          <p className="text-white font-semibold">{featureName}</p>
          <p className="text-sm text-zinc-400 mt-0.5">{featureDescription}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <Lock className="w-3 h-3 text-violet-400" />
        <span className="text-xs font-medium text-violet-400">Upgrade to Pro</span>
      </div>
    </button>
  );
}
