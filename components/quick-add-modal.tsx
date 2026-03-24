'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, DollarSign, Calendar, Sparkles } from 'lucide-react';
import { BillFormData, BillCategory, categoryEmojis } from '@/types';
import { cn, formatDateForInput } from '@/lib/utils';
import { searchVendors, VendorSuggestion } from '@/lib/vendor-suggestions';
import { useToast } from '@/components/ui/toast';
import { Bill } from '@/types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (bill: Bill) => void;
}

export function QuickAddModal({ isOpen, onClose, onSuccess }: QuickAddModalProps) {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(formatDateForInput(new Date()));
  const [category, setCategory] = useState<BillCategory | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [emoji, setEmoji] = useState('📄');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<VendorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [matchedVendor, setMatchedVendor] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; dueDate?: string }>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setAmount(null);
      setDueDate(formatDateForInput(new Date()));
      setCategory(null);
      setPaymentUrl(null);
      setEmoji('📄');
      setMatchedVendor(null);
      setSuggestions([]);
      setFieldErrors({});
      document.body.style.overflow = 'hidden';
      // Focus name input after animation
      focusTimerRef.current = setTimeout(() => nameInputRef.current?.focus(), 200);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
    setFieldErrors((prev) => ({ ...prev, name: undefined }));
    if (matchedVendor && value !== matchedVendor) {
      setMatchedVendor(null);
    }
    const results = searchVendors(value);
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  }, [matchedVendor]);

  const handleSelectVendor = useCallback((vendor: VendorSuggestion) => {
    setName(vendor.name);
    setMatchedVendor(vendor.name);
    if (vendor.typical_amount !== null) setAmount(vendor.typical_amount);
    setCategory(vendor.category);
    setEmoji(categoryEmojis[vendor.category]);
    if (vendor.payment_url) setPaymentUrl(vendor.payment_url);
    setShowSuggestions(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; dueDate?: string } = {};
    if (!name.trim()) errors.name = 'Bill name is required';
    if (!dueDate) errors.dueDate = 'Due date is required';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    try {
      const formData: BillFormData = {
        name: name.trim(),
        amount,
        due_date: dueDate,
        emoji,
        category,
        is_recurring: false,
        recurrence_interval: null,
        recurrence_day_of_month: null,
        recurrence_weekday: null,
        payment_url: paymentUrl,
        is_autopay: false,
      };

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save bill');
      }

      const bill = await response.json();
      onSuccess(bill);
      onClose();
    } catch (error) {
      console.error('Error saving bill:', error);
      addToast({
        message: 'Failed to add bill',
        description: error instanceof Error ? error.message : 'Please try again',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Bottom sheet — positioned above bottom nav + browser chrome */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center sm:inset-0 sm:items-center sm:px-4" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <div
          className={cn(
            'relative w-full max-w-md bg-[#0c0c10] border border-white/10 shadow-2xl',
            'rounded-t-3xl sm:rounded-3xl',
            'animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in-95 duration-300',
            'max-h-[80vh] overflow-y-auto'
          )}
          onClick={(e) => e.stopPropagation()}
          style={{ paddingBottom: '24px' }}
        >
          {/* Handle bar (mobile) */}
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-bold text-white">Quick Add</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close quick add"
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-5 pb-5 pt-2 space-y-4">
            {/* Name with autocomplete */}
            <div className="relative" ref={suggestionsRef}>
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{emoji}</span>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Bill name (e.g. Netflix)"
                  className={cn(
                    'w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl',
                    'text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
                    'transition-all font-medium'
                  )}
                  style={{ fontSize: '16px' }}
                  autoComplete="off"
                />
              </div>

              {/* Autocomplete suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-10 right-0 mt-1 py-1 bg-[#0a0a0f] border border-white/10 rounded-xl shadow-2xl shadow-black/80 max-h-48 overflow-y-auto">
                  {suggestions.map((vendor) => (
                    <button
                      key={vendor.name}
                      type="button"
                      onClick={() => handleSelectVendor(vendor)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{categoryEmojis[vendor.category]}</span>
                        <span className="text-white text-sm font-medium">{vendor.name}</span>
                      </div>
                      {vendor.typical_amount !== null && (
                        <span className="text-xs text-zinc-500">${vendor.typical_amount.toFixed(2)}/mo</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.name && (
                <p className="text-xs text-red-400 mt-1 ml-11">{fieldErrors.name}</p>
              )}
            </div>

            {/* Vendor match indicator */}
            {matchedVendor && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-violet-300">Auto-filled from {matchedVendor}</span>
              </div>
            )}

            {/* Amount and Due Date side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={amount ?? ''}
                    onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Due Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all appearance-none [color-scheme:dark]"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                {fieldErrors.dueDate && (
                  <p className="text-xs text-red-400 mt-1">{fieldErrors.dueDate}</p>
                )}
              </div>
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full py-3.5 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {isLoading ? 'Adding...' : 'Add Bill'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
