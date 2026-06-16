import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { connect } from 'node:http2';
import { SignJWT, importPKCS8 } from 'jose';

const APNS_HOST = 'https://api.push.apple.com';
const APNS_JWT_TTL_SECONDS = 50 * 60;
const APNS_JWT_REFRESH_BUFFER_SECONDS = 60;
const APNS_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const INVALID_TOKEN_REASONS = new Set([
  'BadDeviceToken',
  'DeviceTokenNotForTopic',
  'Unregistered',
]);

type CachedJwt = {
  token: string;
  expiresAt: number;
};

export type APNsAlert = {
  title: string;
  body: string;
};

export type APNsPayload = {
  aps: {
    alert: APNsAlert;
    sound?: string;
    badge?: number;
  };
  billId?: string;
  url?: string;
  deeplink?: string;
  messageType?: 'bill_due_soon' | 'manual_test' | 'bill_reminder';
};

export type APNsResponseBody = {
  reason?: string;
  timestamp?: number;
};

export type ApnsSendInput = {
  userId: string;
  token: string;
  tokenId?: string;
  payload: APNsPayload;
};

export type ApnsSendResult = {
  success: boolean;
  status: number | null;
  errorCode: string | null;
  responseBody: APNsResponseBody | null;
  shouldDeactivateToken: boolean;
  sentAt: string;
};

type ApnsSendLogEntry = {
  timestamp: string;
  user_id: string;
  token: string;
  status: 'success' | 'failure';
  error_code: string | null;
  status_code: number | null;
};

function maskToken(token: string): string {
  if (token.length <= 10) {
    return `${token.slice(0, 4)}...${token.slice(-2)}`;
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export function isValidApnsToken(token: string): boolean {
  return APNS_TOKEN_PATTERN.test(token.trim());
}

export function normalizeApnsToken(token: string): string {
  return token.trim();
}

function getRequiredEnv() {
  const {
    APNS_KEY_ID,
    APNS_TEAM_ID,
    APNS_BUNDLE_ID,
    APNS_KEY_CONTENT,
    APNS_TOPIC,
  } = process.env;

  if (!APNS_KEY_ID || !APNS_TEAM_ID || !APNS_BUNDLE_ID || !APNS_KEY_CONTENT || !APNS_TOPIC) {
    throw new Error(
      'Missing APNs configuration. Required env vars: APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID, APNS_KEY_CONTENT, APNS_TOPIC.'
    );
  }

  return {
    keyId: APNS_KEY_ID,
    teamId: APNS_TEAM_ID,
    bundleId: APNS_BUNDLE_ID,
    keyContentBase64: APNS_KEY_CONTENT,
    topic: APNS_TOPIC,
  };
}

async function appendSendLog(entry: ApnsSendLogEntry): Promise<void> {
  const logsDir = path.join(process.cwd(), 'logs');
  const date = entry.timestamp.slice(0, 10);
  const logPath = path.join(logsDir, `apns-sends-${date}.json`);

  await mkdir(logsDir, { recursive: true });

  let existing: ApnsSendLogEntry[] = [];

  try {
    const raw = await readFile(logPath, 'utf8');
    existing = JSON.parse(raw) as ApnsSendLogEntry[];
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      throw error;
    }
  }

  existing.push(entry);
  await writeFile(logPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
}

class ApnsSender {
  private signingKey: Awaited<ReturnType<typeof importPKCS8>> | null = null;
  private jwtCache: CachedJwt | null = null;

  private async getSigningKey(): Promise<Awaited<ReturnType<typeof importPKCS8>>> {
    if (this.signingKey) {
      return this.signingKey;
    }

    const { keyContentBase64 } = getRequiredEnv();
    const privateKey = Buffer.from(keyContentBase64, 'base64').toString('utf8').trim();

    this.signingKey = await importPKCS8(privateKey, 'ES256');
    return this.signingKey;
  }

  private async getJwt(forceRefresh = false): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    if (
      !forceRefresh &&
      this.jwtCache &&
      this.jwtCache.expiresAt > now + APNS_JWT_REFRESH_BUFFER_SECONDS
    ) {
      return this.jwtCache.token;
    }

    const { keyId, teamId } = getRequiredEnv();
    const signingKey = await this.getSigningKey();

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt(now)
      .sign(signingKey);

    this.jwtCache = {
      token,
      expiresAt: now + APNS_JWT_TTL_SECONDS,
    };

    return token;
  }

  private async requestApns(
    token: string,
    payload: APNsPayload,
    forceRefresh = false
  ): Promise<{ status: number | null; body: APNsResponseBody | null }> {
    const { bundleId, topic } = getRequiredEnv();
    const jwt = await this.getJwt(forceRefresh);

    return await new Promise((resolve, reject) => {
      const client = connect(APNS_HOST);
      const timeout = setTimeout(() => {
        client.destroy(new Error('APNS request timeout'));
      }, 60000);

      const cleanup = () => {
        clearTimeout(timeout);
        if (!client.destroyed) {
          client.close();
        }
      };

      client.on('error', (error) => {
        cleanup();
        reject(error);
      });

      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': topic,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-collapse-id': payload.billId ?? bundleId,
        'content-type': 'application/json',
      });

      let status: number | null = null;
      let raw = '';

      req.setEncoding('utf8');
      req.on('response', (headers) => {
        const headerStatus = headers[':status'];
        status = typeof headerStatus === 'number' ? headerStatus : Number(headerStatus ?? 0) || null;
      });
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('error', (error) => {
        cleanup();
        reject(error);
      });
      req.on('end', () => {
        cleanup();
        let body: APNsResponseBody | null = null;
        if (raw) {
          try {
            body = JSON.parse(raw) as APNsResponseBody;
          } catch {
            body = null;
          }
        }
        resolve({ status, body });
      });

      req.end(JSON.stringify(payload));
    });
  }

  async sendNotification(input: ApnsSendInput): Promise<ApnsSendResult> {
    const token = normalizeApnsToken(input.token);
    const sentAt = new Date().toISOString();

    if (!isValidApnsToken(token)) {
      const result: ApnsSendResult = {
        success: false,
        status: 400,
        errorCode: 'MalformedToken',
        responseBody: { reason: 'MalformedToken' },
        shouldDeactivateToken: false,
        sentAt,
      };

      await appendSendLog({
        timestamp: sentAt,
        user_id: input.userId,
        token: maskToken(token),
        status: 'failure',
        error_code: result.errorCode,
        status_code: result.status,
      });

      return result;
    }

    let status: number | null = null;
    let responseBody: APNsResponseBody | null = null;
    let errorCode: string | null = null;

    try {
      let response = await this.requestApns(token, input.payload, false);
      status = response.status;
      responseBody = response.body;

      if (
        status === 403 &&
        (responseBody?.reason === 'ExpiredProviderToken' ||
          responseBody?.reason === 'InvalidProviderToken')
      ) {
        response = await this.requestApns(token, input.payload, true);
        status = response.status;
        responseBody = response.body;
      }

      if (status !== 200) {
        errorCode = responseBody?.reason ?? `HTTP_${status ?? 'UNKNOWN'}`;
      }
    } catch (error) {
      errorCode = error instanceof Error ? error.message : 'APNS_REQUEST_FAILED';
    }

    const success = status === 200 && !errorCode;
    const shouldDeactivateToken =
      status === 410 ||
      (status === 400 && INVALID_TOKEN_REASONS.has(responseBody?.reason ?? '')) ||
      INVALID_TOKEN_REASONS.has(errorCode ?? '');

    const result: ApnsSendResult = {
      success,
      status,
      errorCode,
      responseBody,
      shouldDeactivateToken,
      sentAt,
    };

    await appendSendLog({
      timestamp: sentAt,
      user_id: input.userId,
      token: maskToken(token),
      status: success ? 'success' : 'failure',
      error_code: result.errorCode,
      status_code: result.status,
    });

    return result;
  }
}

export function buildBillDueSoonPayload(bills: Array<{
  id: string;
  name: string;
  amount: number | null;
  due_date: string;
  emoji: string | null;
  payment_url?: string | null;
}>, today = new Date()): APNsPayload {
  const sortedBills = [...bills].sort((left, right) => left.due_date.localeCompare(right.due_date));
  const nextBill = sortedBills[0];
  const dueDate = new Date(`${nextBill.due_date}T00:00:00.000Z`);
  const todayUtc = new Date(`${today.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const daysUntilDue = Math.round((dueDate.getTime() - todayUtc.getTime()) / 86400000);
  const dueText = daysUntilDue <= 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`;
  const title =
    sortedBills.length === 1
      ? `${nextBill.emoji ?? '💳'} ${nextBill.name} due soon`
      : 'Bills due soon';
  const amountText =
    nextBill.amount !== null ? `${nextBill.name} is $${nextBill.amount.toFixed(2)} due ${dueText}` : `${nextBill.name} is due ${dueText}`;
  const body =
    sortedBills.length === 1
      ? amountText
      : `${sortedBills.length} bills are due in the next 7 days. Next up: ${amountText}`;

  return {
    aps: {
      alert: { title, body },
      sound: 'default',
    },
    billId: nextBill.id,
    url: nextBill.payment_url ?? `/dashboard?bill=${nextBill.id}`,
    deeplink: `app.duezo://bill/${nextBill.id}`,
    messageType: 'bill_due_soon',
  };
}

export const apnsSender = new ApnsSender();
