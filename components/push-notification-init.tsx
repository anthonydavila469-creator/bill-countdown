'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Initializes push notifications when running as a native app.
 * This component should be included once at the app root level.
 */
export function PushNotificationInit() {
  useEffect(() => {
    // Only initialize on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const initPush = async () => {
      try {
        // Dynamically import to avoid issues on web
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Check permissions
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          // Request permission
          const result = await PushNotifications.requestPermissions();
          if (result.receive !== 'granted') {
            console.log('Push notifications not granted');
            return;
          }
        } else if (permStatus.receive !== 'granted') {
          return;
        }

        // Register for push
        await PushNotifications.register();

        // Handle registration
        PushNotifications.addListener('registration', (token) => {
          console.log('Push token:', token.value);
          // Store token for sending notifications later
          localStorage.setItem('pushToken', token.value);
        });

        // Handle errors
        PushNotifications.addListener('registrationError', (err) => {
          console.error('Push registration error:', err);
        });

        // Handle notifications received in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Notification received:', notification);
        });

        // Handle notification tap
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Notification action:', action);
          // Navigate based on notification data
          const data = action.notification.data;
          if (data?.route) {
            window.location.href = data.route;
          }
        });

      } catch (error) {
        console.error('Push init error:', error);
      }
    };

    initPush();
  }, []);

  // This component doesn't render anything
  return null;
}
