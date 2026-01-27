/**
 * Sync Notifications
 * Push notifications for automatic bill sync results
 */

import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PushSubscription } from '@/types';

// Configure web-push with VAPID keys
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    'mailto:support@billcountdown.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send push notification when new bills are detected during auto-sync
 */
export async function sendNewBillsDetectedPush(
  supabase: SupabaseClient,
  userId: string,
  billCount: number,
  needsReviewCount: number
): Promise<{ sent: number; failed: number }> {
  const results = { sent: 0, failed: 0 };

  // Skip if no bills found
  if (billCount === 0 && needsReviewCount === 0) {
    return results;
  }

  // Fetch user's push subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return results;
  }

  // Build notification message
  let body: string;
  if (billCount > 0 && needsReviewCount > 0) {
    body = `${billCount} new bill${billCount > 1 ? 's' : ''} added, ${needsReviewCount} need${needsReviewCount > 1 ? '' : 's'} review`;
  } else if (billCount > 0) {
    body = `${billCount} new bill${billCount > 1 ? 's' : ''} added to your dashboard`;
  } else {
    body = `${needsReviewCount} bill${needsReviewCount > 1 ? 's' : ''} need${needsReviewCount > 1 ? '' : 's'} your review`;
  }

  const payload = JSON.stringify({
    title: 'New Bills Detected',
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'auto-sync-result',
    data: {
      type: 'auto_sync_complete',
      billsCreated: billCount,
      needsReview: needsReviewCount,
      url: needsReviewCount > 0 ? '/review' : '/dashboard',
    },
  });

  const expiredEndpoints: string[] = [];

  // Send to all subscriptions
  for (const subscription of subscriptions as PushSubscription[]) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh_key,
          auth: subscription.auth_key,
        },
      };

      await webpush.sendNotification(pushSubscription, payload);
      results.sent++;
    } catch (err) {
      results.failed++;

      // Track expired subscriptions
      if (err instanceof webpush.WebPushError) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(subscription.endpoint);
        }
      }
    }
  }

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .in('endpoint', expiredEndpoints);
  }

  return results;
}

/**
 * Send push notification for sync errors (optional, for debugging)
 */
export async function sendSyncErrorPush(
  supabase: SupabaseClient,
  userId: string,
  errorMessage: string
): Promise<{ sent: number; failed: number }> {
  const results = { sent: 0, failed: 0 };

  // Fetch user's push subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return results;
  }

  const payload = JSON.stringify({
    title: 'Bill Sync Issue',
    body: 'There was a problem syncing your bills. Please check your Gmail connection.',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'auto-sync-error',
    data: {
      type: 'auto_sync_error',
      error: errorMessage,
      url: '/settings',
    },
  });

  for (const subscription of subscriptions as PushSubscription[]) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh_key,
          auth: subscription.auth_key,
        },
      };

      await webpush.sendNotification(pushSubscription, payload);
      results.sent++;
    } catch {
      results.failed++;
    }
  }

  return results;
}
