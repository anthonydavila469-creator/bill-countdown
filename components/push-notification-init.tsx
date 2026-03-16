'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@/lib/supabase/client';

/**
 * Initializes push notifications when running as a native app.
 * Registers the device token with the server so we can send bill reminders.
 */
export function PushNotificationInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initPush = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const { PushNotifications } = await import('@capacitor/push-notifications');

        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          const result = await PushNotifications.requestPermissions();
          if (result.receive !== 'granted') {
            console.log('Push notifications not granted');
            return;
          }
        } else if (permStatus.receive !== 'granted') {
          return;
        }

        // Add listeners BEFORE calling register() to avoid race condition
        PushNotifications.addListener('registration', async (token) => {
          console.log('APNs token received:', token.value.slice(0, 8) + '...');

          localStorage.setItem('pushToken', token.value);

          try {
            const response = await fetch('/api/push/register-device', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ deviceToken: token.value, userId: user.id }),
            });

            if (!response.ok) {
              const err = await response.json();
              console.error('Failed to register push token:', err);
            } else {
              console.log('Push token registered with server');
            }
          } catch (err) {
            console.error('Error sending token to server:', err);
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration error:', err);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Notification received in foreground:', notification.title);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data;
          if (data?.url) {
            window.location.href = data.url;
          } else if (data?.billId) {
            window.location.href = `/dashboard?bill=${data.billId}`;
          }
        });

        // Now register AFTER listeners are set up
        console.log('[Push] Calling PushNotifications.register()...');
        await PushNotifications.register();
        console.log('[Push] register() called — waiting for APNs token...');
      } catch (error) {
        console.error('Push init error:', error);
      }
    };

    void initPush();
  }, []);

  return null;
}
