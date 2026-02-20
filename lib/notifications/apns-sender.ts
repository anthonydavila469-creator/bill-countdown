import apn from '@parse/node-apn';
import type { Bill } from '@/types';

let provider: apn.Provider | null = null;

function getProvider(): apn.Provider {
  if (provider) return provider;

  const keyBase64 = process.env.APNS_PRIVATE_KEY;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;

  if (!keyBase64 || !keyId || !teamId) {
    throw new Error('Missing APNs environment variables (APNS_PRIVATE_KEY, APNS_KEY_ID, APNS_TEAM_ID)');
  }

  const keyBuffer = Buffer.from(keyBase64, 'base64');

  provider = new apn.Provider({
    token: {
      key: keyBuffer,
      keyId,
      teamId,
    },
    production: process.env.NODE_ENV === 'production',
  });

  return provider;
}

export interface APNsResult {
  sent: number;
  failed: number;
  expiredTokens: string[];
}

/**
 * Send a bill reminder push notification via APNs to one or more iOS device tokens
 */
export async function sendBillReminderAPNs(
  deviceTokens: string[],
  bill: Bill,
  daysUntilDue: number
): Promise<APNsResult> {
  const result: APNsResult = { sent: 0, failed: 0, expiredTokens: [] };

  if (!deviceTokens.length) return result;

  let apnsProvider: apn.Provider;
  try {
    apnsProvider = getProvider();
  } catch (err) {
    console.error('APNs provider init failed:', err);
    result.failed = deviceTokens.length;
    return result;
  }

  const bundleId = process.env.APNS_BUNDLE_ID ?? 'app.duezo';

  const dueText =
    daysUntilDue === 0 ? 'today' :
    daysUntilDue === 1 ? 'tomorrow' :
    `in ${daysUntilDue} days`;

  const amountText = bill.amount ? `$${bill.amount.toFixed(2)} ` : '';
  const body = `${amountText}due ${dueText}`;
  const title = `${bill.emoji ?? '💳'} ${bill.name}`;

  for (const token of deviceTokens) {
    const notification = new apn.Notification();
    notification.expiry = Math.floor(Date.now() / 1000) + 86400; // 24h
    notification.badge = 1;
    notification.sound = 'default';
    notification.alert = { title, body };
    notification.topic = bundleId;
    notification.payload = {
      billId: bill.id,
      url: bill.payment_url || '/dashboard',
    };
    notification.pushType = 'alert';
    notification.priority = 10;

    try {
      const response = await apnsProvider.send(notification, token);

      if (response.sent.length > 0) {
        result.sent++;
      }

      for (const failure of response.failed) {
        console.error(`APNs failure for token ${token.slice(0, 8)}...:`, failure.response);
        // 410 = token is no longer valid (device unregistered)
        if (failure.response?.reason === 'Unregistered' || failure.response?.reason === 'BadDeviceToken') {
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
