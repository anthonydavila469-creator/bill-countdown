import webpush from 'web-push';
import type { Bill, PushSubscription } from '@/types';

// Configure web-push with VAPID keys
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    'mailto:support@billcountdown.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface SendPushResult {
  success: boolean;
  error?: string;
}

/**
 * Send a push notification for a bill reminder
 */
export async function sendBillReminderPush(
  subscription: PushSubscription,
  bill: Bill,
  daysUntilDue: number
): Promise<SendPushResult> {
  try {
    const dueText = daysUntilDue === 0
      ? 'today'
      : daysUntilDue === 1
        ? 'tomorrow'
        : `in ${daysUntilDue} days`;

    const amountText = bill.amount
      ? `$${bill.amount.toFixed(2)}`
      : '';

    const body = amountText
      ? `${amountText} due ${dueText}`
      : `Due ${dueText}`;

    const payload = JSON.stringify({
      title: `${bill.emoji} ${bill.name}`,
      body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: `bill-${bill.id}`,
      data: {
        billId: bill.id,
        url: bill.payment_url || '/dashboard',
      },
    });

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    };

    await webpush.sendNotification(pushSubscription, payload);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Push notification error:', message);

    // Check for subscription errors (expired/invalid)
    if (err instanceof webpush.WebPushError) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        return { success: false, error: 'Subscription expired or invalid' };
      }
    }

    return { success: false, error: message };
  }
}

/**
 * Send push notification to all subscriptions for a user
 */
export async function sendBillReminderPushToAll(
  subscriptions: PushSubscription[],
  bill: Bill,
  daysUntilDue: number
): Promise<{ sent: number; failed: number; expiredEndpoints: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    expiredEndpoints: [] as string[],
  };

  for (const subscription of subscriptions) {
    const result = await sendBillReminderPush(subscription, bill, daysUntilDue);

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      if (result.error === 'Subscription expired or invalid') {
        results.expiredEndpoints.push(subscription.endpoint);
      }
    }
  }

  return results;
}
