'use client';

import { useState, useEffect, useCallback } from 'react';

export type PaycheckFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface PaycheckSettings {
  frequency: PaycheckFrequency;
  lastPayday: string; // YYYY-MM-DD
  estimatedAmount: number | null; // optional paycheck amount
}

const STORAGE_KEY = 'duezo_paycheck_settings';

const DEFAULT_SETTINGS: PaycheckSettings = {
  frequency: 'biweekly',
  lastPayday: '',
  estimatedAmount: null,
};

/**
 * Calculate the next N paydays based on frequency and last payday
 */
export function getNextPaydays(settings: PaycheckSettings, count: number): Date[] {
  if (!settings.lastPayday) return [];

  const paydays: Date[] = [];
  const lastPayday = new Date(settings.lastPayday + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the most recent payday (could be in the past or future)
  let currentPayday = new Date(lastPayday);

  // Move forward/backward to find the next upcoming payday after today
  switch (settings.frequency) {
    case 'weekly': {
      // Move forward by weeks until we pass today
      while (currentPayday < today) {
        currentPayday.setDate(currentPayday.getDate() + 7);
      }
      // If we went past, check if we should go back one
      const prevPayday = new Date(currentPayday);
      prevPayday.setDate(prevPayday.getDate() - 7);
      if (prevPayday >= today) {
        currentPayday = prevPayday;
      }
      break;
    }
    case 'biweekly': {
      while (currentPayday < today) {
        currentPayday.setDate(currentPayday.getDate() + 14);
      }
      const prevPayday = new Date(currentPayday);
      prevPayday.setDate(prevPayday.getDate() - 14);
      if (prevPayday >= today) {
        currentPayday = prevPayday;
      }
      break;
    }
    case 'semimonthly': {
      // Semimonthly: typically 1st & 15th or 15th & last day
      // We'll use the day from lastPayday and assume 1st/15th pattern
      const day = lastPayday.getDate();
      const isFirstHalf = day <= 15;

      // Start from the lastPayday month
      let year = lastPayday.getFullYear();
      let month = lastPayday.getMonth();
      let nextDay = isFirstHalf ? 15 : 1;

      currentPayday = new Date(year, month, nextDay, 12, 0, 0);

      // If we picked the 1st but need to advance to next month
      if (!isFirstHalf) {
        currentPayday.setMonth(month + 1);
      }

      // Move forward until we're at or past today
      while (currentPayday < today) {
        if (currentPayday.getDate() === 1) {
          currentPayday.setDate(15);
        } else {
          currentPayday.setMonth(currentPayday.getMonth() + 1);
          currentPayday.setDate(1);
        }
      }
      break;
    }
    case 'monthly': {
      const dayOfMonth = lastPayday.getDate();
      let year = lastPayday.getFullYear();
      let month = lastPayday.getMonth();

      currentPayday = new Date(year, month, dayOfMonth, 12, 0, 0);

      while (currentPayday < today) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
        // Handle months with fewer days
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        currentPayday = new Date(year, month, Math.min(dayOfMonth, lastDayOfMonth), 12, 0, 0);
      }
      break;
    }
  }

  // Now collect the next N paydays starting from currentPayday
  for (let i = 0; i < count; i++) {
    paydays.push(new Date(currentPayday));

    // Advance to next payday
    switch (settings.frequency) {
      case 'weekly':
        currentPayday.setDate(currentPayday.getDate() + 7);
        break;
      case 'biweekly':
        currentPayday.setDate(currentPayday.getDate() + 14);
        break;
      case 'semimonthly':
        if (currentPayday.getDate() === 1) {
          currentPayday.setDate(15);
        } else {
          currentPayday.setMonth(currentPayday.getMonth() + 1);
          currentPayday.setDate(1);
        }
        break;
      case 'monthly': {
        const originalDay = new Date(settings.lastPayday + 'T12:00:00').getDate();
        currentPayday.setMonth(currentPayday.getMonth() + 1);
        const lastDayOfMonth = new Date(
          currentPayday.getFullYear(),
          currentPayday.getMonth() + 1,
          0
        ).getDate();
        currentPayday.setDate(Math.min(originalDay, lastDayOfMonth));
        break;
      }
    }
  }

  return paydays;
}

/**
 * Hook for managing paycheck settings in localStorage
 */
export function usePaycheckSettings() {
  const [settings, setSettings] = useState<PaycheckSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PaycheckSettings;
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Failed to load paycheck settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: PaycheckSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save paycheck settings:', error);
    }
  }, []);

  // Clear settings
  const clearSettings = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSettings(null);
    } catch (error) {
      console.error('Failed to clear paycheck settings:', error);
    }
  }, []);

  // Check if settings are configured
  const hasSettings = settings !== null && settings.lastPayday !== '';

  return {
    settings,
    isLoaded,
    hasSettings,
    saveSettings,
    clearSettings,
  };
}
