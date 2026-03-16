'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@/lib/supabase/client';

async function registerTokenWithServer(deviceToken: string) {
  const supabase = createClient();
  const [sessionResult, userResult] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const accessToken = sessionResult.data.session?.access_token;
  const userId = userResult.data.user?.id;

  if (!accessToken || !userId) {
    localStorage.setItem('pendingPushToken', deviceToken);
    return;
  }

  const response = await fetch('/api/push/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      deviceToken,
      userId,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || `Push registration failed (${response.status})`);
  }

  localStorage.setItem('pushToken', deviceToken);
  localStorage.removeItem('pendingPushToken');
}

/**
 * Initializes native push notifications and registers the device token with the backend.
 */
export function PushNotificationInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let isMounted = true;

    const initPush = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        await PushNotifications.removeAllListeners();

        PushNotifications.addListener('registration', async (token) => {
          if (!isMounted) {
            return;
          }

          try {
            await registerTokenWithServer(token.value);
            console.log('APNs token registered with server');
          } catch (error) {
            console.error('Failed to register APNs token with backend:', error);
          }
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data;
          if (action.actionId === 'DISMISS_BILL_REMINDER') {
            return;
          }
          if (data?.url) {
            window.location.href = data.url;
            return;
          }
          if (data?.billId) {
            window.location.href = `/dashboard?bill=${data.billId}`;
          }
        });

        const permissionStatus = await PushNotifications.checkPermissions();
        const finalStatus = permissionStatus.receive === 'prompt'
          ? await PushNotifications.requestPermissions()
          : permissionStatus;

        if (finalStatus.receive !== 'granted') {
          console.log('Push notifications not granted');
          return;
        }

        const pendingToken = localStorage.getItem('pendingPushToken');
        if (pendingToken) {
          try {
            await registerTokenWithServer(pendingToken);
          } catch (error) {
            console.error('Failed to flush cached APNs token:', error);
          }
        }

        await PushNotifications.register();
      } catch (error) {
        console.error('Push init error:', error);
      }
    };

    void initPush();

    return () => {
      isMounted = false;
      void import('@capacitor/push-notifications').then(({ PushNotifications }) => {
        PushNotifications.removeAllListeners();
      });
    };
  }, []);

  return null;
}
