'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Initializes push notifications when running as a native app.
 * Registers the device token with the server so we can send bill reminders.
 */
export function PushNotificationInit() {
  useEffect(() => {
    // Only initialize on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initPush = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { Device } = await import('@capacitor/device');

        // Check/request permissions
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

        // Register for push with APNs
        await PushNotifications.register();

        // Handle APNs token — send to our backend
        PushNotifications.addListener('registration', async (token) => {
          console.log('APNs token received:', token.value.slice(0, 8) + '...');

          // Cache locally
          localStorage.setItem('pushToken', token.value);

          // Get device ID for deduplication
          let deviceId: string | undefined;
          try {
            const info = await Device.getId();
            deviceId = info.identifier;
          } catch {
            // Device ID is optional — continue without it
          }

          // Register with our server
          try {
            const response = await fetch('/api/notifications/register-device', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: token.value, deviceId }),
            });

            if (!response.ok) {
              const err = await response.json();
              console.error('Failed to register push token:', err);
            } else {
              console.log('Push token registered with server ✅');
            }
          } catch (err) {
            console.error('Error sending token to server:', err);
          }
        });

        // Handle registration errors
        PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration error:', err);
        });

        // Handle notifications received while app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Notification received in foreground:', notification.title);
        });

        // Handle notification tap — navigate to relevant screen
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data;
          if (data?.url) {
            window.location.href = data.url;
          } else if (data?.billId) {
            window.location.href = `/dashboard?bill=${data.billId}`;
          }
        });

      } catch (error) {
        console.error('Push init error:', error);
      }
    };

    initPush();
  }, []);

  return null;
}
