'use client';

import { useState } from 'react';
import { RecurringSuggestion } from '@/lib/recurring-detection';
import { RecurrenceInterval } from '@/types';
import { getBillIcon } from '@/lib/get-bill-icon';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Check,
  X,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Zap,
} from 'lucide-react';

interface RecurringDetectionBannerProps {
  suggestions: RecurringSuggestion[];
  onMarkRecurring: (billId: string, interval: RecurrenceInterval) => void;
  onMarkAllRecurring: () => void;
  onDismiss: (billId: string) => void;
  onDismissAll: () => void;
  className?: string;
}

// Confidence badge styling
function getConfidenceBadge(confidence: number) {
  if (confidence > 0.8) {
    return {
      label: 'High',
      bgClass: 'bg-emerald-500/20',
      textClass: 'text-emerald-300',
      borderClass: 'border-emerald-500/30',
    };
  } else if (confidence >= 0.5) {
    return {
      label: 'Medium',
      bgClass: 'bg-amber-500/20',
      textClass: 'text-amber-300',
      borderClass: 'border-amber-500/30',
    };
  } else {
    return {
      label: 'Low',
      bgClass: 'bg-orange-500/20',
      textClass: 'text-orange-300',
      borderClass: 'border-orange-500/30',
    };
  }
}

// Interval display formatting
function formatInterval(interval: RecurrenceInterval): string {
  const map: Record<RecurrenceInterval, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
  };
  return map[interval] || interval;
}

export function RecurringDetectionBanner({
  suggestions,
  onMarkRecurring,
  onMarkAllRecurring,
  onDismiss,
  onDismissAll,
  className,
}: RecurringDetectionBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no suggestions
  if (suggestions.length === 0) return null;

  // Limit to top 3 suggestions
  const displayedSuggestions = suggestions.slice(0, 3);
  const remainingCount = suggestions.length - 3;

  if (!isExpanded) {
    // Collapsed state - compact banner
    return (
      <div className={cn('relative', className)}>
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-purple-500/10 rounded-2xl blur-xl opacity-60" />

        <button
          onClick={() => setIsExpanded(true)}
          type="button"
          aria-expanded="false"
          aria-controls="recurring-detection-panel"
          className={cn(
            'group relative w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl',
            'bg-gradient-to-br from-violet-900/30 via-indigo-900/20 to-purple-900/30',
            'backdrop-blur-xl',
            'border border-violet-500/20 hover:border-violet-400/40',
            'shadow-[0_0_40px_rgba(139,92,246,0.15)]',
            'transition-all duration-300',
            'hover:shadow-[0_0_50px_rgba(139,92,246,0.25)]',
            'animate-in fade-in slide-in-from-top-2 duration-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60'
          )}
        >
          {/* Left accent line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-violet-400 via-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />

          <div className="flex items-center gap-4">
            {/* Sparkles icon with glow */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-10 h-10 rounded-xl bg-violet-500/20 blur-lg" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/20 border border-violet-500/40 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-300" />
              </div>
            </div>

            <div>
              <span className="font-semibold text-white">Smart Detection</span>
              <p className="text-xs text-zinc-400 mt-0.5">
                {suggestions.length} bill{suggestions.length !== 1 ? 's' : ''}{' '}
                <span className="text-violet-300">may be recurring</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-500 group-hover:text-white group-hover:bg-white/[0.06] group-hover:border-white/[0.1] transition-all duration-200">
            <span className="text-xs font-medium">Review</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>
    );
  }

  // Expanded state - full panel
  return (
    <div className={cn('relative', className)}>
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-purple-500/10 rounded-2xl blur-2xl opacity-50" />

      <div
        id="recurring-detection-panel"
        className={cn(
          'relative rounded-2xl overflow-hidden',
          'bg-gradient-to-br from-violet-900/30 via-indigo-900/20 to-purple-900/30',
          'backdrop-blur-xl',
          'border border-violet-500/20',
          'shadow-[0_0_40px_rgba(139,92,246,0.15)]',
          'animate-in fade-in slide-in-from-top-2 duration-500'
        )}
      >
        {/* Top gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')] pointer-events-none" />

        {/* Header */}
        <button
          onClick={() => setIsExpanded(false)}
          type="button"
          aria-expanded="true"
          aria-controls="recurring-detection-panel"
          className={cn(
            'w-full px-6 py-5 flex items-center justify-between border-b border-white/[0.06] hover:bg-white/[0.02] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60'
          )}
        >
          <div className="flex items-center gap-4">
            {/* Pulsing indicator with icon */}
            <div className="relative">
              <div
                className="absolute inset-0 rounded-xl bg-violet-500/30 animate-ping opacity-75"
                style={{ animationDuration: '2s' }}
              />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/25 to-indigo-500/15 border border-violet-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <Sparkles className="w-5 h-5 text-violet-300" />
              </div>
            </div>

            <div className="text-left">
              <h2 className="font-semibold text-white">Smart Detection</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {suggestions.length} bill{suggestions.length !== 1 ? 's' : ''}{' '}
                <span className="text-violet-300">detected as potentially recurring</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
            <span className="text-xs font-medium">Collapse</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </button>

        {/* Suggestion items */}
        <div className="p-2 sm:p-4 space-y-2 sm:space-y-3">
          {displayedSuggestions.map((suggestion, index) => (
            <SuggestionItem
              key={suggestion.bill.id}
              suggestion={suggestion}
              onMarkRecurring={onMarkRecurring}
              onDismiss={onDismiss}
              animationDelay={index * 50}
            />
          ))}

          {/* Remaining count indicator */}
          {remainingCount > 0 && (
            <div className="px-4 py-2 text-center text-xs text-zinc-500">
              +{remainingCount} more suggestion{remainingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
          <button
            onClick={onDismissAll}
            type="button"
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60'
            )}
          >
            <X className="w-3.5 h-3.5" />
            Dismiss All
          </button>

          <button
            onClick={onMarkAllRecurring}
            type="button"
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200',
              'bg-gradient-to-r from-violet-600 to-indigo-600',
              'hover:from-violet-500 hover:to-indigo-500',
              'text-white',
              'shadow-lg shadow-violet-500/25',
              'active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60'
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            Mark All as Recurring
          </button>
        </div>
      </div>
    </div>
  );
}

// Individual suggestion item component
interface SuggestionItemProps {
  suggestion: RecurringSuggestion;
  onMarkRecurring: (billId: string, interval: RecurrenceInterval) => void;
  onDismiss: (billId: string) => void;
  animationDelay: number;
}

function SuggestionItem({
  suggestion,
  onMarkRecurring,
  onDismiss,
  animationDelay,
}: SuggestionItemProps) {
  const { bill, suggestedInterval, confidence, reason } = suggestion;
  const { icon: BillIcon, colorClass } = getBillIcon(bill);
  const confidenceBadge = getConfidenceBadge(confidence);

  return (
    <div
      className={cn(
        'group relative flex items-stretch gap-0 rounded-xl overflow-hidden',
        'bg-gradient-to-r from-white/[0.03] via-white/[0.02] to-white/[0.03]',
        'border border-white/[0.08] hover:border-violet-500/30',
        'transition-all duration-300 hover:scale-[1.01]',
        'animate-in fade-in slide-in-from-left-2'
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'backwards' }}
    >
      {/* Left accent bar */}
      <div className="relative w-1.5 flex-shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500 via-indigo-500 to-purple-500" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center gap-1.5 sm:gap-3 p-2 sm:p-3 pl-1.5 sm:pl-3 pr-2.5 sm:pr-3">
        {/* Bill icon */}
        <div
          className={cn(
            'relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0',
            'bg-white/[0.05] border border-white/[0.08]',
            'group-hover:bg-white/[0.08] transition-colors'
          )}
        >
          <BillIcon className={cn('w-4 h-4 sm:w-5 sm:h-5', colorClass)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Name */}
            <h3 className="font-semibold text-white text-sm truncate max-w-[100px] sm:max-w-[150px]">
              {bill.name}
            </h3>

            {/* Confidence badge */}
            <span
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                confidenceBadge.bgClass,
                confidenceBadge.textClass,
                confidenceBadge.borderClass
              )}
            >
              {confidenceBadge.label}
            </span>

            {/* Interval badge */}
            <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
              <RefreshCw className="w-2.5 h-2.5" />
              {formatInterval(suggestedInterval)}
            </span>
          </div>

          {/* Reason */}
          <p className="text-xs text-zinc-500 truncate mt-0.5 hidden sm:block">
            {reason}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Mark as Recurring button */}
          <button
            onClick={() => onMarkRecurring(bill.id, suggestedInterval)}
            type="button"
            aria-label={`Mark ${bill.name} as recurring`}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200',
              'bg-gradient-to-r from-violet-600/80 to-indigo-600/80',
              'hover:from-violet-500 hover:to-indigo-500',
              'text-white',
              'active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60'
            )}
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark</span>
          </button>

          {/* Dismiss button */}
          <button
            onClick={() => onDismiss(bill.id)}
            type="button"
            aria-label={`Dismiss ${bill.name} suggestion`}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
              'bg-white/[0.05] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40',
              'text-zinc-400 hover:text-rose-400',
              'active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60'
            )}
            title="Dismiss suggestion"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
