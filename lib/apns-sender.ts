import { readFile } from 'node:fs/promises';
import http2 from 'node:http2';
import { importPKCS8, SignJWT } from 'jose';

const APNS_HOST =
  process.env.NODE_ENV === 'production'
    ? 'api.push.apple.com'
    : 'api.sandbox.push.apple.com';

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID;

type CachedJwt = {
  token: string;
  expiresAt: number;
};

export type ApnsPushPayload = {
  aps: {
    alert?: {
      title?: string;
      body?: string;
    };
    sound?: string;
    badge?: number;
    category?: string;
    'thread-id'?: string;
  };
  billId?: string;
  amount?: number | null;
  daysUntilDue?: number;
  url?: string;
};

export type ApnsSendResult = {
  ok: boolean;
  status: number;
  apnsId?: string;
  reason?: string;
};

let cachedJwt: CachedJwt | null = null;
let privateKeyPromise: Promise<CryptoKey> | null = null;

function assertApnsEnv() {
  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID) {
    throw new Error('Missing APNs configuration (APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID)');
  }
}

async function loadPrivateKeyPem() {
  const keyPath = process.env.APNS_KEY_PATH;
  const keyValue = process.env.APNS_KEY_BASE64 ?? process.env.APNS_PRIVATE_KEY;

  if (keyPath) {
    return readFile(keyPath, 'utf8');
  }

  if (!keyValue) {
    throw new Error('Missing APNS private key (set APNS_KEY_PATH, APNS_KEY_BASE64, or APNS_PRIVATE_KEY)');
  }

  if (keyValue.includes('BEGIN PRIVATE KEY')) {
    return keyValue;
  }

  const decoded = Buffer.from(keyValue, 'base64').toString('utf8');
  if (decoded.includes('BEGIN PRIVATE KEY')) {
    return decoded;
  }

  return keyValue;
}

async function getPrivateKey() {
  if (!privateKeyPromise) {
    privateKeyPromise = loadPrivateKeyPem().then((pem) => importPKCS8(pem, 'ES256'));
  }

  return privateKeyPromise;
}

async function getBearerToken() {
  assertApnsEnv();

  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > now + 60) {
    return cachedJwt.token;
  }

  const privateKey = await getPrivateKey();
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: APNS_KEY_ID! })
    .setIssuer(APNS_TEAM_ID!)
    .setIssuedAt(now)
    .sign(privateKey);

  cachedJwt = {
    token,
    expiresAt: now + (55 * 60),
  };

  return token;
}

export async function sendPush(deviceToken: string, payload: ApnsPushPayload): Promise<ApnsSendResult> {
  assertApnsEnv();

  const bearerToken = await getBearerToken();
  const client = http2.connect(`https://${APNS_HOST}`);

  try {
    const body = JSON.stringify(payload);
    const headers = {
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${bearerToken}`,
      'apns-topic': APNS_BUNDLE_ID!,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(body)),
    };

    return await new Promise<ApnsSendResult>((resolve, reject) => {
      const request = client.request(headers);
      let rawResponse = '';
      let status = 0;
      let apnsId: string | undefined;

      request.setEncoding('utf8');
      request.on('response', (responseHeaders) => {
        status = Number(responseHeaders[':status'] ?? 0);
        apnsId = Array.isArray(responseHeaders['apns-id'])
          ? responseHeaders['apns-id'][0]
          : responseHeaders['apns-id'];
      });
      request.on('data', (chunk) => {
        rawResponse += chunk;
      });
      request.on('end', () => {
        if (status === 200) {
          resolve({ ok: true, status, apnsId });
          return;
        }

        let reason: string | undefined;
        try {
          reason = rawResponse ? (JSON.parse(rawResponse) as { reason?: string }).reason : undefined;
        } catch {
          reason = rawResponse || 'Unknown APNs error';
        }

        resolve({ ok: false, status, apnsId, reason });
      });
      request.on('error', reject);
      request.write(body);
      request.end();
    });
  } finally {
    client.close();
  }
}

export async function sendBillReminder(
  deviceToken: string,
  billName: string,
  daysUntilDue: number,
  amount: number | null
) {
  const dueText =
    daysUntilDue === 0 ? 'today' :
    daysUntilDue === 1 ? 'tomorrow' :
    `in ${daysUntilDue} days`;

  const amountText = typeof amount === 'number' ? `$${amount.toFixed(2)} ` : '';

  return sendPush(deviceToken, {
    aps: {
      alert: {
        title: billName,
        body: `${amountText}due ${dueText}`.trim(),
      },
      sound: 'default',
      badge: 1,
      category: 'BILL_REMINDER',
      'thread-id': 'bill-reminders',
    },
    amount,
    daysUntilDue,
    url: '/dashboard',
  });
}
