'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initPushNotifications = async () => {
      try {
        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();
        setPermissionStatus(permStatus.receive);

        if (permStatus.receive === 'prompt') {
          // Request permission
          const requestResult = await PushNotifications.requestPermissions();
          setPermissionStatus(requestResult.receive);

          if (requestResult.receive !== 'granted') {
            console.log('Push notification permission denied');
            return;
          }
        } else if (permStatus.receive !== 'granted') {
          console.log('Push notifications not granted');
          return;
        }

        // Register with Apple Push Notification service
        await PushNotifications.register();

        // Listen for registration success
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token:', token.value);
          setToken(token.value);
          // TODO: Send token to your server to store for this user
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        // Listen for push notifications received while app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
          // Handle foreground notification (show in-app alert, update UI, etc.)
        });

        // Listen for push notification action (user tapped on notification)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed:', notification);
          // Navigate to relevant screen based on notification data
          const data = notification.notification.data;
          if (data?.billId) {
            // Could navigate to bill detail
            window.location.href = `/dashboard?highlight=${data.billId}`;
          }
        });

      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  return {
    token,
    permissionStatus,
    isSupported: Capacitor.isNativePlatform(),
  };
}
