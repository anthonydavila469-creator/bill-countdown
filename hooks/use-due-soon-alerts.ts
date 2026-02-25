'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Bill } from '@/types';
import { getDaysUntilDue } from '@/lib/utils';

interface UseDueSoonAlertsReturn {
  dueSoonBills: Bill[];
  totalDueSoon: number;
  isDismissed: boolean;
  dismiss: () => void;
}

const STORAGE_KEY = 'due-soon-banner-dismissed';

function getTodayKey(): string {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function useDueSoonAlerts(bills: Bill[]): UseDueSoonAlertsReturn {
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    setMounted(true);
    const dismissedDate = localStorage.getItem(STORAGE_KEY);
    if (dismissedDate === getTodayKey()) {
      setIsDismissed(true);
    }
  }, []);

  // Filter bills due within 3 days and not paid
  const dueSoonBills = useMemo(() => {
    if (!mounted) return [];
    return bills.filter((bill) => {
      if (bill.is_paid) return false;
      const daysUntil = getDaysUntilDue(bill.due_date);
      return daysUntil <= 3 && daysUntil >= 0;
    });
  }, [bills, mounted]);

  // Calculate total amount due soon
  const totalDueSoon = useMemo(() => {
    return dueSoonBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  }, [dueSoonBills]);

  // Dismiss handler - stores today's date in localStorage
  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, getTodayKey());
    setIsDismissed(true);
  }, []);

  return {
    dueSoonBills,
    totalDueSoon,
    isDismissed,
    dismiss,
  };
}
