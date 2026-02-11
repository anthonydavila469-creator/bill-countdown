'use client';

import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = "Couldn't load your bills — tap to retry.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-16 px-6',
      'rounded-2xl border border-white/[0.06] bg-gradient-to-br from-rose-500/[0.04] to-transparent',
      className
    )}>
      <div className="text-5xl mb-4">😵‍💫</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-xs mb-6">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

export function GmailSyncError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Gmail sync failed"
      description="We couldn't sync your inbox. Give it another shot."
      onRetry={onRetry}
    />
  );
}
