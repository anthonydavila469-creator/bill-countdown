import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limit';
import { handleInboundEmail } from '@/lib/inbound/webhook-handler';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractSenderForRateLimit(payload: Record<string, unknown>): string {
  const message = (payload.message as Record<string, unknown> | undefined) || {};
  const from = message.from;

  if (typeof from === 'string') return from;
  if (Array.isArray(from) && from.length > 0) {
    const first = from[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null) {
      const record = first as Record<string, unknown>;
      return String(record.email || record.address || 'unknown');
    }
  }
  return 'unknown';
}

export async function POST(request: Request) {
  let payload: Record<string, unknown> | null = null;

  try {
    const rawBody = await request.json().catch(() => null);
    if (!isObject(rawBody)) {
      console.warn('[INBOUND] Invalid webhook body');
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    payload = rawBody;
    const eventType = typeof payload.event_type === 'string' ? payload.event_type : null;

    console.log('[INBOUND] Webhook received', {
      eventType,
      from: extractSenderForRateLimit(payload),
    });

    if (!eventType) {
      return NextResponse.json({ error: 'Missing event_type' }, { status: 400 });
    }

    if (eventType !== 'message.received') {
      return NextResponse.json({ received: true, ignored: true, eventType });
    }

    if (!isObject(payload.message)) {
      return NextResponse.json({ error: 'Missing message payload' }, { status: 400 });
    }

    // Rate limit by sender email
    const sender = extractSenderForRateLimit(payload);
    if (isRateLimited(`agentmail:${sender}:bill-email`, 50, 60 * 60 * 1000)) {
      console.warn('[INBOUND] Rate limit exceeded', { sender });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const result = await handleInboundEmail(payload);

    console.log('[INBOUND] Webhook processed', {
      ok: result.ok,
      status: result.status,
    });

    return NextResponse.json(
      result.ok
        ? { received: true, status: result.status }
        : { received: true, status: result.status, error: result.error },
      { status: 200 }
    );
  } catch (error) {
    console.error('[INBOUND] Unexpected webhook error', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
