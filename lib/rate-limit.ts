/**
 * Simple in-memory rate limiter.
 * Not shared across serverless instances — good enough for basic protection.
 */

const requestLog = new Map<string, number[]>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [key, timestamps] of requestLog) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, filtered);
    }
  }
}, 300_000);

/**
 * Returns true if the request should be BLOCKED (rate exceeded).
 * @param key - unique key (e.g. userId + endpoint)
 * @param maxRequests - max requests in the window
 * @param windowMs - time window in milliseconds
 */
export function isRateLimited(
  key: string,
  maxRequests = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(key) || [];
  const recent = timestamps.filter((t) => t > now - windowMs);
  if (recent.length >= maxRequests) {
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
}
