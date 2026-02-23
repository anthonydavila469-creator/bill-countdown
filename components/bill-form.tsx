'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { BillFormData, BillCategory, RecurrenceInterval, categoryEmojis, categoryIconKeys, BillIconKey } from '@/types';
import { cn, formatDateForInput, getNextDueDate, formatNextDueDate } from '@/lib/utils';
import { applyAutoCategorization } from '@/lib/auto-categorize';
import { Calendar, DollarSign, RefreshCw, ChevronDown, Link, CreditCard, Sparkles, Check, ExternalLink, AlertCircle } from 'lucide-react';

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
  { value: 'rent', label: 'Rent', emoji: '🏠' },
  { value: 'housing', label: 'Housing (Mortgage/HOA)', emoji: '🏡' },
  { value: 'insurance', label: 'Insurance', emoji: '🛡️' },
  { value: 'phone', label: 'Phone', emoji: '📱' },
  { value: 'internet', label: 'Internet', emoji: '📡' },
  { value: 'credit_card', label: 'Credit Card', emoji: '💳' },
  { value: 'loan', label: 'Loan', emoji: '🏦' },
  { value: 'health', label: 'Health & Fitness', emoji: '💪' },
  { value: 'other', label: 'Other', emoji: '📄' },
];

const recurrenceOptions: { value: RecurrenceInterval; label: string; shortLabel: string }[] = [
  { value: 'weekly', label: 'Weekly', shortLabel: '7d' },
  { value: 'biweekly', label: 'Biweekly', shortLabel: '14d' },
  { value: 'monthly', label: 'Monthly', shortLabel: '1mo' },
  { value: 'yearly', label: 'Yearly', shortLabel: '1yr' },
];

const commonEmojis = ['📄', '💡', '📺', '🏠', '🛡️', '📱', '📡', '💳', '🏦', '🎵', '🚗', '💊', '🏋️', '☁️', '🎮'];

// Generate day options 1-31
const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

// Custom dropdown for day of month (to ensure consistent dark styling across all browsers)
function DayOfMonthDropdown({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (day: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Scroll to position when dropdown opens
  useEffect(() => {
    if (isOpen && listRef.current) {
      // Use setTimeout to ensure DOM is fully rendered after animations start
      const timer = setTimeout(() => {
        if (listRef.current) {
          const selectedValue = value || 1;
          const itemHeight = 44; // Approximate height of each item
          const scrollPosition = Math.max(0, (selectedValue - 3) * itemHeight);
          listRef.current.scrollTop = scrollPosition;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, value]);

  const selectedDay = value || 1;

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300 overflow-visible">
      <label className="block text-xs font-medium text-violet-200/70 uppercase tracking-wider mb-3">
        Day of Month
      </label>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 pl-4 pr-10 py-3",
            "bg-white/5 border border-violet-400/20 rounded-xl",
            "text-white text-left",
            "focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400/30",
            "transition-all cursor-pointer backdrop-blur-sm",
            isOpen && "ring-2 ring-violet-400/50 border-violet-400/30"
          )}
        >
          <Calendar className="w-4 h-4 text-violet-300 flex-shrink-0" />
          <span>{selectedDay}{getOrdinalSuffix(selectedDay)} of each month</span>
        </button>
        <ChevronDown className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-300 pointer-events-none transition-transform duration-200",
          isOpen && "rotate-180"
        )} />

        {/* Dropdown menu - opens upward to avoid overlap with content below */}
        {isOpen && (
          <div
            ref={listRef}
            className="absolute z-[100] w-full bottom-full mb-2 py-2 bg-[#0a0a0f] border border-violet-400/30 rounded-xl shadow-2xl shadow-black/80 max-h-64 overflow-y-auto"
          >
            {dayOptions.map((day) => {
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onChange(day);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-2.5 text-left transition-all duration-200",
                    isSelected
                      ? "bg-gradient-to-r from-violet-400/25 via-violet-400/15 to-transparent text-white border-l-2 border-violet-300 shadow-[inset_0_0_20px_rgba(245,158,11,0.1)]"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border-l-2 border-transparent"
                  )}
                >
                  <span className={cn(
                    "transition-all",
                    isSelected && "font-medium"
                  )}>{day}{getOrdinalSuffix(day)} of each month</span>
                  {isSelected && (
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-400/30">
                      <Check className="w-3 h-3 text-violet-200" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="text-xs text-zinc-500 mt-3">
        If the month has fewer days, the bill will be due on the last day
      </p>
    </div>
  );
}

// Custom dropdown for category selection (to ensure consistent dark styling across all browsers)
function CategoryDropdown({
  value,
  onChange,
}: {
  value: BillCategory | null;
  onChange: (category: BillCategory | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedCategory = categories.find(c => c.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3",
          "bg-white/5 border border-white/10 rounded-xl",
          "text-left",
          "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent",
          "transition-all cursor-pointer",
          isOpen && "ring-2 ring-violet-500"
        )}
      >
        {selectedCategory ? (
          <>
            <span className="text-lg">{selectedCategory.emoji}</span>
            <span className="text-white">{selectedCategory.label}</span>
          </>
        ) : (
          <span className="text-zinc-500">Select a category</span>
        )}
      </button>
      <ChevronDown className={cn(
        "absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none transition-transform duration-200",
        isOpen && "rotate-180"
      )} />

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-[100] w-full top-full mt-2 py-2 bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl shadow-black/80 max-h-64 overflow-y-auto">
          {/* Clear option */}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-200",
              !value
                ? "bg-violet-500/20 text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <span className="text-lg">📋</span>
            <span>No category</span>
          </button>

          {categories.map((cat) => {
            const isSelected = cat.value === value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  onChange(cat.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 text-left transition-all duration-200",
                  isSelected
                    ? "bg-violet-500/20 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className={isSelected ? "font-medium" : ""}>{cat.label}</span>
                </div>
                {isSelected && (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-500/30">
                    <Check className="w-3 h-3 text-violet-300" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    recurrence_day_of_month: initialData?.recurrence_day_of_month || null,
    recurrence_weekday: initialData?.recurrence_weekday || null,
    payment_url: initialData?.payment_url || null,
    is_autopay: initialData?.is_autopay || false,
  });

  // Track if user has manually changed category to prevent auto-override
  const [userChangedCategory, setUserChangedCategory] = useState(!!initialData?.category);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-set day of month from due date when monthly is selected
  useEffect(() => {
    if (formData.recurrence_interval === 'monthly' && formData.recurrence_day_of_month === null && formData.due_date) {
      const day = new Date(formData.due_date + 'T12:00:00').getDate();
      setFormData(prev => ({ ...prev, recurrence_day_of_month: day }));
    }
  }, [formData.recurrence_interval, formData.due_date, formData.recurrence_day_of_month]);

  // Auto-categorize when bill name changes (only if user hasn't manually set a category)
  useEffect(() => {
    if (!userChangedCategory && formData.name.trim().length >= 3) {
      const result = applyAutoCategorization(formData.name, null, null);
      if (result.category) {
        setFormData(prev => ({
          ...prev,
          category: result.category,
          emoji: result.category ? categoryEmojis[result.category] : prev.emoji,
        }));
      }
    }
  }, [formData.name, userChangedCategory]);

  // Calculate next due date preview
  const nextDueDate = useMemo(() => {
    if (!formData.is_recurring || !formData.recurrence_interval || !formData.due_date) {
      return null;
    }
    return getNextDueDate(formData.due_date, formData.recurrence_interval, {
      dayOfMonth: formData.recurrence_day_of_month,
      weekday: formData.recurrence_weekday,
    });
  }, [formData.is_recurring, formData.recurrence_interval, formData.due_date, formData.recurrence_day_of_month, formData.recurrence_weekday]);

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
    setUserChangedCategory(true); // Mark that user manually changed category
    setFormData((prev) => ({
      ...prev,
      category,
      emoji: category ? categoryEmojis[category] : prev.emoji,
    }));
  };

  const handleRecurringToggle = (checked: boolean) => {
    handleChange('is_recurring', checked);
    if (!checked) {
      handleChange('recurrence_interval', null);
      handleChange('recurrence_day_of_month', null);
      handleChange('recurrence_weekday', null);
    }
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

    // Validate payment URL must start with https://
    if (formData.payment_url && !formData.payment_url.startsWith('https://')) {
      newErrors.payment_url = 'Payment link must start with https://';
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
    <form onSubmit={handleSubmit} className="space-y-6 touch-manipulation">
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
              'w-full px-4 py-4 bg-white/5 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all font-medium',
              errors.name ? 'border-red-500' : 'border-white/10'
            )}
            style={{ fontSize: '16px' }}
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
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            <input
              type="number"
              inputMode="decimal"
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
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Due Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none',
                '[color-scheme:dark]',
                errors.due_date ? 'border-red-500' : 'border-white/10'
              )}
              style={{ fontSize: '16px' }} // Prevents iOS zoom on focus
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
        <CategoryDropdown
          value={formData.category}
          onChange={handleCategoryChange}
        />
      </div>

      {/* Premium Recurring Section */}
      <div className={cn(
        "relative rounded-2xl transition-all duration-500",
        formData.is_recurring
          ? "bg-gradient-to-br from-violet-400/10 via-violet-500/5 to-violet-500/10 border border-violet-400/20 overflow-visible"
          : "bg-white/[0.02] border border-white/10 overflow-hidden"
      )}>
        {/* Subtle animated gradient background when active */}
        {formData.is_recurring && (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400/0 via-violet-400/10 to-violet-400/0 animate-[shimmer_3s_ease-in-out_infinite]" />
          </div>
        )}

        <div className="relative p-5 space-y-5">
          {/* Toggle Header */}
          <button
            type="button"
            onClick={() => handleRecurringToggle(!formData.is_recurring)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
                formData.is_recurring
                  ? "bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg shadow-violet-400/25"
                  : "bg-white/5 group-hover:bg-white/10"
              )}>
                <RefreshCw className={cn(
                  "w-5 h-5 transition-all duration-300",
                  formData.is_recurring
                    ? "text-white animate-[spin_8s_linear_infinite]"
                    : "text-zinc-400 group-hover:text-zinc-300"
                )} />
                {formData.is_recurring && (
                  <div className="absolute inset-0 rounded-xl bg-white/20 animate-ping opacity-0" />
                )}
              </div>
              <div className="text-left">
                <span className={cn(
                  "font-semibold transition-colors",
                  formData.is_recurring ? "text-white" : "text-zinc-300 group-hover:text-white"
                )}>
                  Recurring Bill
                </span>
                <p className={cn(
                  "text-xs transition-colors",
                  formData.is_recurring ? "text-violet-200/70" : "text-zinc-500"
                )}>
                  {formData.is_recurring ? "Auto-generates next due date" : "Enable for repeating bills"}
                </p>
              </div>
            </div>

            {/* Premium Toggle Switch */}
            <div className={cn(
              "relative w-14 h-8 rounded-full transition-all duration-300",
              formData.is_recurring
                ? "bg-gradient-to-r from-violet-400 to-violet-500 shadow-lg shadow-violet-400/30"
                : "bg-white/10"
            )}>
              <div className={cn(
                "absolute top-1 w-6 h-6 rounded-full transition-all duration-300 shadow-md",
                formData.is_recurring
                  ? "left-7 bg-white"
                  : "left-1 bg-zinc-400"
              )}>
                {formData.is_recurring && (
                  <Sparkles className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-violet-400" />
                )}
              </div>
            </div>
          </button>

          {/* Expanded Options */}
          <div className={cn(
            "space-y-5 overflow-hidden transition-all duration-500",
            formData.is_recurring ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
            {/* Interval Selector - Luxury Pills */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-violet-200/70 uppercase tracking-wider">
                Frequency
              </label>
              <div className="grid grid-cols-4 gap-2">
                {recurrenceOptions.map((option) => {
                  const isSelected = formData.recurrence_interval === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('recurrence_interval', option.value)}
                      className={cn(
                        "relative group/pill py-3 px-2 rounded-xl text-center transition-all duration-300 overflow-hidden",
                        isSelected
                          ? "bg-white text-zinc-900 shadow-lg shadow-white/20"
                          : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10"
                      )}
                    >
                      {/* Hover gradient effect */}
                      {!isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-400/0 to-violet-500/0 group-hover/pill:from-violet-400/10 group-hover/pill:to-violet-500/10 transition-all duration-300" />
                      )}
                      <span className="relative block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className={cn(
                        "relative block text-[10px] mt-0.5 font-medium",
                        isSelected ? "text-zinc-500" : "text-zinc-500 group-hover/pill:text-zinc-400"
                      )}>
                        {option.shortLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.recurrence_interval && (
                <p className="text-sm text-red-400">{errors.recurrence_interval}</p>
              )}
            </div>

            {/* Day of Month Selector (for Monthly) */}
            {formData.recurrence_interval === 'monthly' && (
              <DayOfMonthDropdown
                value={formData.recurrence_day_of_month}
                onChange={(day) => handleChange('recurrence_day_of_month', day)}
              />
            )}

            {/* Next Due Date Preview */}
            {nextDueDate && (
              <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-violet-500/10 blur-sm" />
                <div className="relative flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-emerald-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-emerald-400/70 font-medium uppercase tracking-wider">Next Due</p>
                      <p className="text-white font-semibold">
                        {formatNextDueDate(nextDueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Auto-scheduled</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Autopay */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-emerald-500/20 transition-colors">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_autopay}
            onChange={(e) => handleChange('is_autopay', e.target.checked)}
            className="w-5 h-5 rounded bg-white/5 border-white/20 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
          />
          <CreditCard className={cn(
            "w-5 h-5 transition-colors",
            formData.is_autopay ? "text-emerald-400" : "text-zinc-400"
          )} />
          <div>
            <span className="text-white font-medium">Autopay enabled</span>
            <p className="text-xs text-zinc-500">This bill is paid automatically</p>
          </div>
        </label>
      </div>

      {/* Payment URL */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Payment Link (optional)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="url"
              value={formData.payment_url || ''}
              onChange={(e) => {
                const value = e.target.value || null;
                handleChange('payment_url', value);
                // Clear error when user types
                if (errors.payment_url) {
                  setErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors.payment_url;
                    return newErrors;
                  });
                }
              }}
              onBlur={() => {
                // Validate URL on blur
                if (formData.payment_url && !formData.payment_url.startsWith('https://')) {
                  setErrors((prev) => ({
                    ...prev,
                    payment_url: 'Payment link must start with https://',
                  }));
                }
              }}
              placeholder="https://pay.example.com/..."
              className={cn(
                "w-full pl-10 pr-4 py-3 bg-white/5 border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all",
                errors.payment_url ? "border-red-500" : "border-white/10"
              )}
              style={{ fontSize: '16px' }}
            />
          </div>
          {/* Test Link Button */}
          <button
            type="button"
            onClick={() => {
              if (formData.payment_url) {
                if (!formData.payment_url.startsWith('https://')) {
                  setErrors((prev) => ({
                    ...prev,
                    payment_url: 'Payment link must start with https://',
                  }));
                  return;
                }
                window.open(formData.payment_url, '_blank');
              }
            }}
            disabled={!formData.payment_url}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all",
              formData.payment_url
                ? "bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30"
                : "bg-white/5 border border-white/10 text-zinc-500 cursor-not-allowed"
            )}
          >
            <ExternalLink className="w-4 h-4" />
            Test
          </button>
        </div>
        {errors.payment_url ? (
          <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.payment_url}
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">
            Add a direct link to pay this bill online (must start with https://)
          </p>
        )}
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

// Helper function for ordinal suffixes
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
