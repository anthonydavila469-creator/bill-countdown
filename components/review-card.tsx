'use client';

import { useState } from 'react';
import { BillCategory, categoryEmojis, categoryLabels } from '@/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { EvidenceSnippet } from '@/lib/bill-extraction/types';
import {
  Mail,
  DollarSign,
  Calendar,
  AlertTriangle,
  Check,
  X,
  Edit3,
  ChevronDown,
  ChevronUp,
  Quote,
  Tag,
} from 'lucide-react';

interface ReviewItem {
  id: string;
  extracted_name: string | null;
  extracted_amount: number | null;
  extracted_due_date: string | null;
  extracted_category: BillCategory | null;
  confidence_overall: number | null;
  confidence_amount: number | null;
  confidence_due_date: number | null;
  evidence_snippets: EvidenceSnippet[];
  is_duplicate: boolean;
  duplicate_reason: string | null;
  created_at: string;
  emails_raw?: {
    subject: string;
    from_address: string;
    date_received: string;
  } | null;
}

interface ReviewCardProps {
  item: ReviewItem;
  onConfirm: (id: string, corrections?: {
    name?: string;
    amount?: number;
    due_date?: string;
    category?: BillCategory;
  }) => void;
  onReject: (id: string) => void;
  isLoading?: boolean;
}

// Confidence level styling
function getConfidenceStyle(confidence: number | null) {
  if (confidence === null) {
    return {
      label: 'Unknown',
      bgClass: 'bg-gray-500/20',
      textClass: 'text-gray-400',
    };
  }
  if (confidence >= 0.85) {
    return {
      label: 'High',
      bgClass: 'bg-emerald-500/20',
      textClass: 'text-emerald-400',
    };
  }
  if (confidence >= 0.6) {
    return {
      label: 'Medium',
      bgClass: 'bg-violet-400/20',
      textClass: 'text-violet-300',
    };
  }
  return {
    label: 'Low',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
  };
}

export function ReviewCard({
  item,
  onConfirm,
  onReject,
  isLoading = false,
}: ReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [editName, setEditName] = useState(item.extracted_name || '');
  const [editAmount, setEditAmount] = useState(
    item.extracted_amount?.toString() || ''
  );
  const [editDueDate, setEditDueDate] = useState(item.extracted_due_date || '');
  const [editCategory, setEditCategory] = useState<BillCategory | null>(
    item.extracted_category
  );

  const confidenceStyle = getConfidenceStyle(item.confidence_overall);
  const emoji = item.extracted_category
    ? categoryEmojis[item.extracted_category]
    : '📧';

  const handleConfirm = () => {
    if (isEditing) {
      onConfirm(item.id, {
        name: editName || undefined,
        amount: editAmount ? parseFloat(editAmount) : undefined,
        due_date: editDueDate || undefined,
        category: editCategory || undefined,
      });
    } else {
      onConfirm(item.id);
    }
  };

  const formatSender = (from: string) => {
    const match = from.match(/^([^<]+)</);
    if (match) return match[1].trim();
    const emailMatch = from.match(/@([^.]+)/);
    if (emailMatch) {
      return emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1);
    }
    return from;
  };

  const categories: BillCategory[] = [
    'utilities', 'subscription', 'rent', 'housing', 'insurance',
    'phone', 'internet', 'credit_card', 'loan', 'health', 'other',
  ];

  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-white/[0.02] backdrop-blur-xl',
        'border border-white/5',
        'hover:border-white/10 hover:bg-white/[0.04]',
        'transition-all duration-300'
      )}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl flex-shrink-0">{emoji}</span>
            <div className="min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-semibold focus:outline-none focus:border-violet-500"
                  placeholder="Bill name"
                />
              ) : (
                <h3 className="font-semibold text-white text-lg truncate">
                  {item.extracted_name || 'Unknown Bill'}
                </h3>
              )}
              <p className="text-sm text-white/50 truncate flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                {item.emails_raw
                  ? formatSender(item.emails_raw.from_address)
                  : 'Unknown sender'}
              </p>
            </div>
          </div>

          {/* Confidence badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              confidenceStyle.bgClass,
              confidenceStyle.textClass
            )}
          >
            {Math.round((item.confidence_overall || 0) * 100)}%
          </div>
        </div>

        {/* Extracted details */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Amount */}
          {isEditing ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-24 bg-transparent text-white font-medium focus:outline-none"
                placeholder="Amount"
              />
            </div>
          ) : item.extracted_amount !== null ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="font-medium">
                {formatCurrency(item.extracted_amount)}
              </span>
              {item.confidence_amount !== null && (
                <span className="text-xs text-white/40">
                  ({Math.round(item.confidence_amount * 100)}%)
                </span>
              )}
            </div>
          ) : null}

          {/* Due date */}
          {isEditing ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
              <Calendar className="w-4 h-4 text-violet-400" />
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none"
              />
            </div>
          ) : item.extracted_due_date ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80">
              <Calendar className="w-4 h-4 text-violet-400" />
              <span>{formatDate(item.extracted_due_date)}</span>
              {item.confidence_due_date !== null && (
                <span className="text-xs text-white/40">
                  ({Math.round(item.confidence_due_date * 100)}%)
                </span>
              )}
            </div>
          ) : null}

          {/* Category */}
          {isEditing ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20">
              <Tag className="w-4 h-4 text-violet-300" />
              <select
                value={editCategory || ''}
                onChange={(e) => setEditCategory(e.target.value as BillCategory || null)}
                className="bg-transparent text-white focus:outline-none"
              >
                <option value="" className="bg-zinc-900">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900">
                    {categoryLabels[cat]}
                  </option>
                ))}
              </select>
            </div>
          ) : item.extracted_category ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80">
              <Tag className="w-4 h-4 text-violet-300" />
              <span>{categoryLabels[item.extracted_category]}</span>
            </div>
          ) : null}
        </div>

        {/* Email subject */}
        {item.emails_raw && (
          <div className="mb-4 p-3 rounded-lg bg-black/20 border border-white/5">
            <p className="text-sm text-white/60 font-medium">
              {item.emails_raw.subject}
            </p>
          </div>
        )}

        {/* Duplicate warning */}
        {item.is_duplicate && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-400/10 border border-violet-400/20 mb-4">
            <AlertTriangle className="w-4 h-4 text-violet-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-violet-300">
                Possible duplicate
              </p>
              <p className="text-xs text-violet-300/70">
                {item.duplicate_reason}
              </p>
            </div>
          </div>
        )}

        {/* Evidence toggle */}
        {item.evidence_snippets.length > 0 && (
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 mb-4 transition-colors"
          >
            <Quote className="w-4 h-4" />
            {showEvidence ? 'Hide' : 'Show'} evidence ({item.evidence_snippets.length})
            {showEvidence ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Evidence snippets */}
        {showEvidence && item.evidence_snippets.length > 0 && (
          <div className="space-y-2 mb-4">
            {item.evidence_snippets.map((evidence, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-black/20 border border-white/5"
              >
                <p className="text-xs text-white/40 mb-1 uppercase">
                  {evidence.field}
                </p>
                <p className="text-sm text-white/70 italic">
                  "{evidence.snippet}"
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
              'bg-gradient-to-r from-emerald-500 to-teal-500',
              'hover:from-emerald-400 hover:to-teal-400',
              'text-white font-medium text-sm',
              'shadow-lg shadow-emerald-500/20',
              'transition-all duration-200',
              'active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Check className="w-4 h-4" />
            {isEditing ? 'Save & Confirm' : 'Confirm'}
          </button>

          {/* Edit button */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
              isEditing
                ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                : 'bg-white/10 text-white/80 border-white/10',
              'hover:bg-white/15',
              'font-medium text-sm',
              'border',
              'transition-all duration-200',
              'active:scale-[0.98]'
            )}
          >
            <Edit3 className="w-4 h-4" />
            {isEditing ? 'Cancel' : 'Edit'}
          </button>

          {/* Reject button */}
          <button
            onClick={() => onReject(item.id)}
            disabled={isLoading}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-xl',
              'bg-white/5 hover:bg-red-500/20',
              'text-white/40 hover:text-red-400',
              'border border-white/5 hover:border-red-500/30',
              'transition-all duration-200',
              'active:scale-[0.98]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            title="Reject this extraction"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
