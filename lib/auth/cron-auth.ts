import { NextResponse } from 'next/server';
import { checkBearerSecret } from './bearer-secret';

/**
 * Shared cron authorization guard.
 *
 * Returns a `NextResponse` to short-circuit the handler when the request is not
 * authorized, or `null` when the caller may proceed. Fails CLOSED: if
 * `CRON_SECRET` is missing/empty the request is rejected with 500 instead of
 * being compared against `Bearer undefined`.
 *
 * Usage:
 *   const denied = cronAuthGuard(request);
 *   if (denied) return denied;
 */
export function cronAuthGuard(request: Request): NextResponse | null {
  const result = checkBearerSecret(request.headers.get('authorization'), process.env.CRON_SECRET);

  if (result.ok) return null;

  if (result.reason === 'missing_secret') {
    console.error('[cron-auth] CRON_SECRET is not configured — refusing request');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
