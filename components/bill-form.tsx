'use client';

import { useState } from 'react';
import { BillFormData, BillCategory, RecurrenceInterval, categoryEmojis } from '@/types';
import { cn, formatDateForInput } from '@/lib/utils';
import { Calendar, DollarSign, RefreshCw, FileText, ChevronDown, Link, CreditCard } from 'lucide-react';

interface BillFormProps {
  initialData?: Partial<BillFormData>;
  onSubmit: (data: BillFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const categories: { value: BillCategory; label: string; emoji: string }[] = [
  { value: 'utilities', label: 'Utilities', emoji: '💡' },
  { value: 'subscription', label: 'Subscription', emoji: '📺' },
  { value: 'rent', label: 'Rent/Mortgage', emoji: '🏠' },
  { value: 'insurance', label: 'Insurance', emoji: '🛡️' },
  { value: 'phone', label: 'Phone', emoji: '📱' },
  { value: 'internet', label: 'Internet', emoji: '📡' },
  { value: 'credit_card', label: 'Credit Card', emoji: '💳' },
  { value: 'loan', label: 'Loan', emoji: '🏦' },
  { value: 'other', label: 'Other', emoji: '📄' },
];

const recurrenceOptions: { value: RecurrenceInterval; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const commonEmojis = ['📄', '💡', '📺', '🏠', '🛡️', '📱', '📡', '💳', '🏦', '🎵', '🚗', '💊', '🏋️', '☁️', '🎮'];

export function BillForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save Bill',
}: BillFormProps) {
  const [formData, setFormData] = useState<BillFormData>({
    name: initialData?.name || '',
    amount: initialData?.amount ?? null,
    due_date: initialData?.due_date || formatDateForInput(new Date()),
    emoji: initialData?.emoji || '📄',
    category: initialData?.category || null,
    is_recurring: initialData?.is_recurring || false,
    recurrence_interval: initialData?.recurrence_interval || null,
    notes: initialData?.notes || null,
    payment_url: initialData?.payment_url || null,
    is_autopay: initialData?.is_autopay || false,
  });

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    field: keyof BillFormData,
    value: string | number | boolean | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is changed
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCategoryChange = (category: BillCategory | null) => {
    setFormData((prev) => ({
      ...prev,
      category,
      emoji: category ? categoryEmojis[category] : prev.emoji,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Bill name is required';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }

    if (formData.is_recurring && !formData.recurrence_interval) {
      newErrors.recurrence_interval = 'Please select a recurrence interval';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name and Emoji */}
      <div className="flex gap-3">
        {/* Emoji picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl hover:bg-white/10 transition-colors"
          >
            {formData.emoji}
          </button>

          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-2 p-3 bg-zinc-900 border border-white/10 rounded-xl shadow-xl z-50 w-[200px]">
              <div className="grid grid-cols-5 gap-2">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      handleChange('emoji', emoji);
                      setShowEmojiPicker(false);
                    }}
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-white/10 transition-colors',
                      formData.emoji === emoji && 'bg-white/20'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Name input */}
        <div className="flex-1">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Bill name"
            className={cn(
              'w-full px-4 py-4 bg-white/5 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg font-medium',
              errors.name ? 'border-red-500' : 'border-white/10'
            )}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
          )}
        </div>
      </div>

      {/* Amount and Due Date */}
      <div className="grid grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Amount (optional)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount ?? ''}
              onChange={(e) =>
                handleChange(
                  'amount',
                  e.target.value ? parseFloat(e.target.value) : null
                )
              }
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Due Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all',
                errors.due_date ? 'border-red-500' : 'border-white/10'
              )}
            />
          </div>
          {errors.due_date && (
            <p className="mt-1 text-sm text-red-400">{errors.due_date}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Category
        </label>
        <div className="relative">
          <select
            value={formData.category || ''}
            onChange={(e) =>
              handleCategoryChange(
                e.target.value ? (e.target.value as BillCategory) : null
              )
            }
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.emoji} {cat.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {/* Recurring */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_recurring}
            onChange={(e) => {
              handleChange('is_recurring', e.target.checked);
              if (!e.target.checked) {
                handleChange('recurrence_interval', null);
              }
            }}
            className="w-5 h-5 rounded bg-white/5 border-white/20 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
          />
          <RefreshCw className="w-5 h-5 text-zinc-400" />
          <span className="text-white font-medium">This is a recurring bill</span>
        </label>

        {formData.is_recurring && (
          <div className="pl-8">
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Repeats
            </label>
            <div className="flex gap-2">
              {recurrenceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    handleChange('recurrence_interval', option.value)
                  }
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    formData.recurrence_interval === option.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.recurrence_interval && (
              <p className="mt-1 text-sm text-red-400">
                {errors.recurrence_interval}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Autopay */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_autopay}
            onChange={(e) => handleChange('is_autopay', e.target.checked)}
            className="w-5 h-5 rounded bg-white/5 border-white/20 text-green-500 focus:ring-green-500 focus:ring-offset-0"
          />
          <CreditCard className="w-5 h-5 text-zinc-400" />
          <div>
            <span className="text-white font-medium">Autopay enabled</span>
            <p className="text-xs text-zinc-500">This bill is paid automatically</p>
          </div>
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Notes (optional)
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-5 h-5 text-zinc-500" />
          <textarea
            value={formData.notes || ''}
            onChange={(e) =>
              handleChange('notes', e.target.value || null)
            }
            placeholder="Add any notes..."
            rows={3}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>

      {/* Payment URL */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Payment Link (optional)
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="url"
            value={formData.payment_url || ''}
            onChange={(e) =>
              handleChange('payment_url', e.target.value || null)
            }
            placeholder="https://pay.example.com/..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Add a direct link to pay this bill online
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
