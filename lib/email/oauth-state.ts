import { createHmac, timingSafeEqual } from 'crypto';

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function getHmacKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

function sign(payload: string): string {
  return createHmac('sha256', getHmacKey()).update(payload).digest('hex');
}

export function createSignedState(provider: string, userId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${provider}:${userId}:${timestamp}`;
  const hmac = sign(payload);
  return `${payload}:${hmac}`;
}

export function verifySignedState(
  state: string
): { provider: string; userId: string } | null {
  const parts = state.split(':');
  if (parts.length !== 4) return null;

  const [provider, userId, timestamp, hmac] = parts;
  const payload = `${provider}:${userId}:${timestamp}`;
  const expected = sign(payload);

  // Timing-safe comparison
  try {
    const a = Buffer.from(hmac, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  // Check expiry
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Date.now() - ts > STATE_MAX_AGE_MS) return null;

  return { provider, userId };
}
