import { sendPush } from '@/lib/apns-sender';
import type { Bill } from '@/types';

export interface APNsResult {
  sent: number;
  failed: number;
  expiredTokens: string[];
}

/**
 * Send a bill reminder push notification via APNs to one or more iOS device tokens.
 */
export async function sendBillReminderAPNs(
  deviceTokens: string[],
  bill: Bill,
  daysUntilDue: number
): Promise<APNsResult> {
  const result: APNsResult = { sent: 0, failed: 0, expiredTokens: [] };

  if (!deviceTokens.length) return result;

  const dueText =
    daysUntilDue === 0 ? 'today' :
    daysUntilDue === 1 ? 'tomorrow' :
    `in ${daysUntilDue} days`;

  const amountText = bill.amount ? `$${bill.amount.toFixed(2)} ` : '';
  const body = `${amountText}due ${dueText}`;
  const title = `${bill.emoji ?? '💳'} ${bill.name}`;

  for (const token of deviceTokens) {
    try {
      const response = await sendPush(token, {
        aps: {
          alert: { title, body },
          sound: 'default',
          badge: 1,
          category: 'BILL_REMINDER',
          'thread-id': 'bill-reminders',
        },
        billId: bill.id,
        amount: bill.amount,
        daysUntilDue,
        url: bill.payment_url || `/dashboard?bill=${bill.id}`,
      });

      if (response.ok) {
        result.sent++;
      } else {
        console.error(`APNs failure for token ${token.slice(0, 8)}...:`, response);
        if (response.reason === 'Unregistered' || response.reason === 'BadDeviceToken') {
          result.expiredTokens.push(token);
        }
        result.failed++;
      }
    } catch (err) {
      console.error('APNs send error:', err);
      result.failed++;
    }
  }

  return result;
}
