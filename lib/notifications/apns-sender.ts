import type { Bill } from '@/types';
import { apnsSender } from '@/lib/apns/apns-sender';

export interface APNsResult {
  sent: number;
  failed: number;
  expiredTokens: string[];
}

export async function sendBillReminderAPNs(
  userId: string,
  deviceTokens: string[],
  bill: Bill,
  daysUntilDue: number
): Promise<APNsResult> {
  const result: APNsResult = { sent: 0, failed: 0, expiredTokens: [] };

  const dueText =
    daysUntilDue === 0 ? 'today' :
    daysUntilDue === 1 ? 'tomorrow' :
    `in ${daysUntilDue} days`;

  const body = bill.amount !== null ? `$${bill.amount.toFixed(2)} due ${dueText}` : `Due ${dueText}`;

  for (const deviceToken of deviceTokens) {
    const sendResult = await apnsSender.sendNotification({
      userId,
      token: deviceToken,
      payload: {
        aps: {
          alert: {
            title: `${bill.emoji ?? '💳'} ${bill.name}`,
            body,
          },
          sound: 'default',
        },
        billId: bill.id,
        url: bill.payment_url ?? `/dashboard?bill=${bill.id}`,
        deeplink: `app.duezo://bill/${bill.id}`,
        messageType: 'bill_reminder',
      },
    });

    if (sendResult.success) {
      result.sent += 1;
      continue;
    }

    if (sendResult.shouldDeactivateToken) {
      result.expiredTokens.push(deviceToken);
    }

    result.failed += 1;
  }

  return result;
}
