'use client';

import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface UsePushNotificationsReturn {
  token: string | null;
  permissionStatus: 'granted' | 'denied' | 'prompt';
  isSupported: boolean;
  isSubscribed: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  useEffect(() => {
    // Check for existing subscription on mount
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('pushToken');
      if (savedToken) {
        setToken(savedToken);
        setIsSubscribed(true);
      }
    }
  }, []);

  useEffect(() => {
    // Only run on native platforms
    if (!isNative) {
      return;
    }

    const initPushNotifications = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();
        setPermissionStatus(permStatus.receive as 'granted' | 'denied' | 'prompt');

        // Listen for registration success
        PushNotifications.addListener('registration', (tokenData) => {
          console.log('Push registration success, token:', tokenData.value);
          setToken(tokenData.value);
          setIsSubscribed(true);
          localStorage.setItem('pushToken', tokenData.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
          setIsSubscribed(false);
        });

        // Listen for push notifications received while app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        });

        // Listen for push notification action (user tapped on notification)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed:', notification);
          const data = notification.notification.data;
          if (data?.billId) {
            window.location.href = `/dashboard?highlight=${data.billId}`;
          }
        });

      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    initPushNotifications();

    return () => {
      if (isNative) {
        import('@capacitor/push-notifications').then(({ PushNotifications }) => {
          PushNotifications.removeAllListeners();
        });
      }
    };
  }, [isNative]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      // For web, use browser notifications
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          setPermissionStatus('granted');
          setIsSubscribed(true);
          return true;
        }
      }
      return false;
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      setPermissionStatus(permResult.receive as 'granted' | 'denied' | 'prompt');

      if (permResult.receive !== 'granted') {
        return false;
      }

      // Register with Apple Push Notification service
      await PushNotifications.register();
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }, [isNative]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsSubscribed(false);
    setToken(null);
    localStorage.removeItem('pushToken');
    
    // Note: There's no way to truly "unregister" from APNs
    // The best we can do is stop sending notifications to this token server-side
  }, []);

  return {
    token,
    permissionStatus,
    isSupported: isNative || (typeof window !== 'undefined' && 'Notification' in window),
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}
