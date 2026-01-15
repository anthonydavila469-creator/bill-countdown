'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bill } from '@/types';
import { getDaysUntilDue } from '@/lib/utils';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  sendNotification: (title: string, options?: NotificationOptions) => void;
  scheduleBillReminders: (bills: Bill[], daysBefore: number[]) => void;
}

/**
 * Hook for managing browser notifications
 */
export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Send a notification
  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') return;

      try {
        const notification = new Notification(title, {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          ...options,
        });

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);

        // Handle click
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    },
    [isSupported, permission]
  );

  // Schedule reminders for bills
  const scheduleBillReminders = useCallback(
    (bills: Bill[], daysBefore: number[] = [7, 3, 1, 0]) => {
      if (!isSupported || permission !== 'granted') return;

      bills.forEach((bill) => {
        if (bill.is_paid) return;

        const daysLeft = getDaysUntilDue(bill.due_date);

        // Check if we should notify for any of the daysBefore thresholds
        if (daysBefore.includes(daysLeft)) {
          let message = '';
          let urgency = '';

          if (daysLeft === 0) {
            message = `${bill.emoji} ${bill.name} is due today!`;
            urgency = 'urgent';
          } else if (daysLeft === 1) {
            message = `${bill.emoji} ${bill.name} is due tomorrow`;
            urgency = 'warning';
          } else if (daysLeft < 0) {
            message = `${bill.emoji} ${bill.name} is ${Math.abs(daysLeft)} days overdue!`;
            urgency = 'overdue';
          } else {
            message = `${bill.emoji} ${bill.name} is due in ${daysLeft} days`;
            urgency = 'reminder';
          }

          sendNotification('Bill Reminder', {
            body: message,
            tag: `bill-${bill.id}-${daysLeft}`, // Prevent duplicate notifications
            data: { billId: bill.id, urgency },
          });
        }
      });
    },
    [isSupported, permission, sendNotification]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    sendNotification,
    scheduleBillReminders,
  };
}

/**
 * Hook for checking bills and triggering notifications
 * Call this periodically (e.g., on app load, every hour)
 */
export function useBillNotificationCheck(
  bills: Bill[],
  enabled: boolean = true,
  daysBefore: number[] = [7, 3, 1, 0]
) {
  const { permission, scheduleBillReminders } = useNotifications();

  useEffect(() => {
    if (!enabled || permission !== 'granted' || bills.length === 0) return;

    // Check on mount
    scheduleBillReminders(bills, daysBefore);

    // Check every hour
    const interval = setInterval(() => {
      scheduleBillReminders(bills, daysBefore);
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [bills, enabled, permission, scheduleBillReminders, daysBefore]);
}
