import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, importPKCS8 } from 'jose';

config({ path: '.env.local' });

const APNS_HOST = 'https://api.push.apple.com';
const APNS_TOKEN_PATTERN = /^[a-fA-F0-9]{64,255}$/;

type ActiveTokenRow = {
  id: string;
  token: string;
  device_name: string | null;
};

type ApnsResponseBody = {
  reason?: string;
  timestamp?: number;
};

function maskToken(token: string): string {
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function appendSendLog(entry: {
  timestamp: string;
  user_id: string;
  token: string;
  status: 'success' | 'failure';
  error_code: string | null;
  status_code: number | null;
}) {
  const logsDir = path.join(process.cwd(), 'logs');
  const logPath = path.join(logsDir, `apns-sends-${entry.timestamp.slice(0, 10)}.json`);
  await mkdir(logsDir, { recursive: true });

  let existing: unknown[] = [];
  try {
    existing = JSON.parse(await readFile(logPath, 'utf8')) as unknown[];
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      throw error;
    }
  }

  existing.push(entry);
  await writeFile(logPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
}

let signingKey: Awaited<ReturnType<typeof importPKCS8>> | null = null;
let jwtCache: { token: string; expiresAt: number } | null = null;

async function getJwt() {
  const now = Math.floor(Date.now() / 1000);
  if (jwtCache && jwtCache.expiresAt > now + 60) {
    return jwtCache.token;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const keyContent = process.env.APNS_KEY_CONTENT;

  if (!keyId || !teamId || !keyContent) {
    throw new Error('Missing APNS_KEY_ID, APNS_TEAM_ID, or APNS_KEY_CONTENT');
  }

  if (!signingKey) {
    signingKey = await importPKCS8(Buffer.from(keyContent, 'base64').toString('utf8').trim(), 'ES256');
  }

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .sign(signingKey);

  jwtCache = {
    token,
    expiresAt: now + 50 * 60,
  };

  return token;
}

async function sendManualNotification(userId: string, tokenRow: ActiveTokenRow, message: string) {
  if (!APNS_TOKEN_PATTERN.test(tokenRow.token)) {
    throw new Error('Stored token is malformed');
  }

  const topic = process.env.APNS_TOPIC;
  if (!topic) {
    throw new Error('Missing APNS_TOPIC');
  }

  const sentAt = new Date().toISOString();
  let status: number | null = null;
  let errorCode: string | null = null;
  let body: ApnsResponseBody | null = null;

  try {
    const response = await fetch(`${APNS_HOST}/3/device/${tokenRow.token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${await getJwt()}`,
        'apns-topic': topic,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        aps: {
          alert: {
            title: 'Duezo Test Notification',
            body: message,
          },
          sound: 'default',
        },
        deeplink: 'duezo://dashboard',
        url: '/dashboard',
        messageType: 'manual_test',
      }),
    });

    status = response.status;
    const text = await response.text();
    body = text ? (JSON.parse(text) as ApnsResponseBody) : null;
    if (status !== 200) {
      errorCode = body?.reason ?? `HTTP_${status}`;
    }
  } catch (error) {
    errorCode = error instanceof Error ? error.message : 'APNS_REQUEST_FAILED';
  }

  await appendSendLog({
    timestamp: sentAt,
    user_id: userId,
    token: maskToken(tokenRow.token),
    status: errorCode ? 'failure' : 'success',
    error_code: errorCode,
    status_code: status,
  });

  return {
    success: !errorCode,
    status,
    errorCode,
    responseBody: body,
    sentAt,
  };
}

async function main() {
  const [, , userId, ...messageParts] = process.argv;
  const message = messageParts.join(' ').trim();

  if (!userId || !message) {
    throw new Error('Usage: node --experimental-strip-types scripts/send-apns-notification.ts <user_id> <message>');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('apns_tokens')
    .select('id, token, device_name')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const tokenRow = (data?.[0] as ActiveTokenRow | undefined);
  if (!tokenRow) {
    throw new Error(`No active APNs tokens found for user ${userId}`);
  }

  const result = await sendManualNotification(userId, tokenRow, message);
  console.log(JSON.stringify({
    userId,
    tokenId: tokenRow.id,
    deviceName: tokenRow.device_name,
    result,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
