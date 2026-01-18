'use client';

import { BillSuggestion, categoryEmojis } from '@/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  Mail,
  DollarSign,
  Calendar,
  AlertTriangle,
  Plus,
  X,
  Edit3,
  Sparkles,
  ExternalLink,
  Eye,
} from 'lucide-react';

interface SuggestionCardProps {
  suggestion: BillSuggestion;
  onAdd: (suggestion: BillSuggestion) => void;
  onEditAndAdd: (suggestion: BillSuggestion) => void;
  onIgnore: (suggestion: BillSuggestion) => void;
  className?: string;
}

// Confidence level styling
function getConfidenceStyle(confidence: number) {
  if (confidence >= 0.7) {
    return {
      label: 'High',
      bgClass: 'bg-emerald-500/20',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30',
    };
  }
  if (confidence >= 0.4) {
    return {
      label: 'Medium',
      bgClass: 'bg-amber-500/20',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/30',
    };
  }
  return {
    label: 'Low',
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
  };
}

export function SuggestionCard({
  suggestion,
  onAdd,
  onEditAndAdd,
  onIgnore,
  className,
}: SuggestionCardProps) {
  const confidenceStyle = getConfidenceStyle(suggestion.confidence);
  const emoji = suggestion.category_guess
    ? categoryEmojis[suggestion.category_guess]
    : '📧';

  // Format sender name (extract from "Name <email>" format)
  const formatSender = (from: string) => {
    const match = from.match(/^([^<]+)</);
    if (match) {
      return match[1].trim();
    }
    // Just email, extract domain
    const emailMatch = from.match(/@([^.]+)/);
    if (emailMatch) {
      return emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1);
    }
    return from;
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-white/[0.02] backdrop-blur-xl',
        'border border-white/5',
        'hover:border-white/10 hover:bg-white/[0.04]',
        'transition-all duration-300',
        className
      )}
    >
      {/* Main content */}
      <div className="p-5">
        {/* Header row: emoji, name, confidence badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl flex-shrink-0">{emoji}</span>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-lg truncate">
                {suggestion.name_guess}
              </h3>
              <p className="text-sm text-white/50 truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {formatSender(suggestion.email_from)}
              </p>
            </div>
          </div>

          {/* Confidence badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              confidenceStyle.bgClass,
              confidenceStyle.textClass,
              'border',
              confidenceStyle.borderClass
            )}
          >
            <Sparkles className="w-3 h-3" />
            {confidenceStyle.label}
          </div>
        </div>

        {/* Extracted details */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Amount */}
          {suggestion.amount_guess !== null ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="font-medium">
                {formatCurrency(suggestion.amount_guess)}
              </span>
            </div>
          ) : suggestion.is_view_online_bill ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Enter amount</span>
            </div>
          ) : null}

          {/* Due date */}
          {suggestion.due_date_guess ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{formatDate(suggestion.due_date_guess)}</span>
            </div>
          ) : suggestion.is_view_online_bill ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Enter due date</span>
            </div>
          ) : null}
        </div>

        {/* View online notice */}
        {suggestion.is_view_online_bill && suggestion.payment_url && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
            <Eye className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-400">
                View statement online
              </p>
              <p className="text-xs text-blue-400/70 mb-2">
                Click below to view amount and due date, then add the bill
              </p>
              <a
                href={suggestion.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Statement
              </a>
            </div>
          </div>
        )}

        {/* Email subject snippet */}
        <div className="mb-4 p-3 rounded-lg bg-black/20 border border-white/5">
          <p className="text-sm text-white/60 font-medium mb-1">
            {suggestion.email_subject}
          </p>
          <p className="text-xs text-white/40 line-clamp-2">
            {suggestion.email_snippet}
          </p>
        </div>

        {/* Duplicate warning */}
        {suggestion.is_possible_duplicate && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">
                Possible duplicate
              </p>
              <p className="text-xs text-amber-400/70">
                {suggestion.duplicate_reason}
              </p>
            </div>
          </div>
        )}

        {/* Matched keywords (collapsed) */}
        {suggestion.matched_keywords && suggestion.matched_keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {suggestion.matched_keywords.slice(0, 3).map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs"
              >
                {keyword}
              </span>
            ))}
            {suggestion.matched_keywords.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs">
                +{suggestion.matched_keywords.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Add Bill button */}
          <button
            onClick={() => onAdd(suggestion)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-gradient-to-r from-blue-500 to-violet-500',
              'hover:from-blue-400 hover:to-violet-400',
              'text-white font-medium text-sm',
              'shadow-lg shadow-blue-500/20',
              'transition-all duration-200',
              'active:scale-[0.98]'
            )}
          >
            <Plus className="w-4 h-4" />
            Add Bill
          </button>

          {/* Edit & Add button */}
          <button
            onClick={() => onEditAndAdd(suggestion)}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-white/10 hover:bg-white/15',
              'text-white/80 hover:text-white font-medium text-sm',
              'border border-white/10 hover:border-white/20',
              'transition-all duration-200',
              'active:scale-[0.98]'
            )}
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>

          {/* Ignore button */}
          <button
            onClick={() => onIgnore(suggestion)}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl',
              'bg-white/5 hover:bg-red-500/20',
              'text-white/40 hover:text-red-400',
              'border border-white/5 hover:border-red-500/30',
              'transition-all duration-200',
              'active:scale-[0.98]'
            )}
            title="Ignore this suggestion"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
