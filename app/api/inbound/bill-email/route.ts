import { NextResponse } from 'next/server';

import { isRateLimited } from '@/lib/rate-limit';
import {
  extractInboxAddress,
  findInboxByAddress,
  handleInboundEmail,
} from '@/lib/inbound/webhook-handler';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let payload: Record<string, unknown> | null = null;

  try {
    const rawBody = await request.json().catch(() => null);
    if (!isObject(rawBody)) {
      console.warn('[INBOUND] Invalid webhook body', {
        contentType: request.headers.get('content-type'),
      });
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    payload = rawBody;
    const eventType = typeof payload.event_type === 'string' ? payload.event_type : null;
    const inboxAddress = extractInboxAddress(payload);

    console.log('[INBOUND] Webhook received', {
      eventType,
      inboxAddress,
      messageId: payload.message_id || (payload.message as Record<string, unknown> | undefined)?.id || null,
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

    if (!inboxAddress) {
      return NextResponse.json({ error: 'Missing recipient address' }, { status: 400 });
    }

    const inbox = await findInboxByAddress(inboxAddress);
    const rateLimitKey = inbox?.user_id
      ? `agentmail:${inbox.user_id}:bill-email`
      : `agentmail:unknown:${inboxAddress}:bill-email`;

    if (isRateLimited(rateLimitKey, 50, 60 * 60 * 1000)) {
      console.warn('[INBOUND] Rate limit exceeded', {
        inboxAddress,
        userId: inbox?.user_id || null,
      });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const result = await handleInboundEmail(payload);

    console.log('[INBOUND] Webhook processed', {
      inboxAddress,
      userId: result.userId || inbox?.user_id || null,
      status: result.status,
      ok: result.ok,
    });

    return NextResponse.json(
      result.ok
        ? { received: true, status: result.status, parsed: result.parsed }
        : { received: true, status: result.status, error: result.error },
      { status: 200 }
    );
  } catch (error) {
    console.error('[INBOUND] Unexpected webhook error', {
      error,
      eventType: payload?.event_type,
    });
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
