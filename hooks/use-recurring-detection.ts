'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bill, RecurrenceInterval } from '@/types';
import { detectPotentialRecurringBills, RecurringSuggestion } from '@/lib/recurring-detection';
import { useBillMutations } from './use-bill-mutations';
import { useToast } from '@/components/ui/toast';

const STORAGE_KEY = 'recurring-detection-dismissed';

export function useRecurringDetection(bills: Bill[]) {
  const { updateBill } = useBillMutations();
  const { addToast } = useToast();

  // Track dismissed bill IDs in localStorage
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Load dismissed IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setDismissedIds(new Set(parsed));
        }
      }
    } catch (error) {
      console.error('Failed to load dismissed IDs from localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when dismissed IDs change
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(dismissedIds)));
    } catch (error) {
      console.error('Failed to save dismissed IDs to localStorage:', error);
    }
  }, [dismissedIds, isInitialized]);

  // Compute suggestions, filtering out dismissed ones
  const suggestions = useMemo<RecurringSuggestion[]>(() => {
    if (!isInitialized || bills.length === 0) return [];

    const allSuggestions = detectPotentialRecurringBills(bills);
    return allSuggestions.filter(s => !dismissedIds.has(s.bill.id));
  }, [bills, dismissedIds, isInitialized]);

  // Dismiss a single suggestion
  const dismissSuggestion = useCallback((billId: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(billId);
      return next;
    });
  }, []);

  // Dismiss all current suggestions
  const dismissAll = useCallback(() => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      suggestions.forEach(s => next.add(s.bill.id));
      return next;
    });
  }, [suggestions]);

  // Mark a bill as recurring
  const markAsRecurring = useCallback(
    async (billId: string, interval: RecurrenceInterval) => {
      const result = await updateBill(billId, {
        is_recurring: true,
        recurrence_interval: interval,
      });

      if (result) {
        // Remove from suggestions (implicit via bill update)
        dismissSuggestion(billId);
        addToast({
          message: `${result.name} marked as recurring`,
          description: `Set to repeat ${interval}`,
          type: 'success',
        });
      }

      return result;
    },
    [updateBill, dismissSuggestion, addToast]
  );

  // Mark all suggestions as recurring
  const markAllAsRecurring = useCallback(async () => {
    let successCount = 0;

    for (const suggestion of suggestions) {
      const result = await updateBill(suggestion.bill.id, {
        is_recurring: true,
        recurrence_interval: suggestion.suggestedInterval,
      });

      if (result) {
        successCount++;
      }
    }

    if (successCount > 0) {
      dismissAll();
      addToast({
        message: `${successCount} bill${successCount > 1 ? 's' : ''} marked as recurring`,
        type: 'success',
      });
    }
  }, [suggestions, updateBill, dismissAll, addToast]);

  return {
    suggestions,
    dismissSuggestion,
    dismissAll,
    markAsRecurring,
    markAllAsRecurring,
    isInitialized,
  };
}
