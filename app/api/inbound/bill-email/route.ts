import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limit';
import { handleInboundEmail } from '@/lib/inbound/webhook-handler';
import { createAdminClient } from '@/lib/supabase/admin';

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

// Fetch full message from AgentMail API if body is missing from webhook
async function enrichMessageBody(message: Record<string, unknown>): Promise<Record<string, unknown>> {
  const hasBody = message.text || message.text_body || message.body_plain || 
                  message.html || message.html_body || message.body_html;
  
  if (hasBody) return message;

  // Try to fetch the full message from AgentMail API
  const smtpId = message.smtp_id || message.id || message.message_id;
  const inboxId = 'duezo-bills@agentmail.to';
  const apiKey = process.env.AGENTMAIL_API_KEY;
  
  if (!smtpId || !apiKey) {
    console.warn('[INBOUND] Cannot enrich — missing smtp_id or API key');
    return message;
  }

  try {
    // Try fetching by smtp_id from the inbox messages list
    const listRes = await fetch(
      `https://api.agentmail.to/v0/inboxes/${inboxId}/messages?limit=5`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    
    if (!listRes.ok) {
      console.warn('[INBOUND] AgentMail list fetch failed:', listRes.status);
      return message;
    }

    const listData = await listRes.json();
    const match = listData.messages?.find((m: any) => 
      m.smtp_id === smtpId || m.message_id === smtpId
    );

    if (!match) {
      console.warn('[INBOUND] Message not found in AgentMail inbox by smtp_id:', smtpId);
      return message;
    }

    // Now fetch the full message content using the thread approach
    const threadRes = await fetch(
      `https://api.agentmail.to/v0/inboxes/${inboxId}/threads/${match.thread_id}/messages`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!threadRes.ok) {
      console.warn('[INBOUND] AgentMail thread fetch failed:', threadRes.status);
      return message;
    }

    const threadData = await threadRes.json();
    const fullMsg = threadData.messages?.find((m: any) => 
      m.smtp_id === smtpId || m.message_id === match.message_id
    );

    if (fullMsg) {
      console.log('[INBOUND] Enriched message from AgentMail API', {
        hasText: !!(fullMsg.text || fullMsg.text_body || fullMsg.body_plain),
        hasHtml: !!(fullMsg.html || fullMsg.html_body || fullMsg.body_html),
      });
      return { ...message, ...fullMsg };
    }

    return message;
  } catch (err) {
    console.error('[INBOUND] AgentMail enrichment error:', err);
    return message;
  }
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

    // Log raw webhook payload keys for debugging
    const message = payload.message as Record<string, unknown> | undefined;
    console.log('[INBOUND] Webhook received', {
      eventType,
      from: extractSenderForRateLimit(payload),
      payloadKeys: Object.keys(payload),
      messageKeys: message ? Object.keys(message) : [],
      hasBody: !!(message?.text || message?.text_body || message?.body_plain || message?.html || message?.html_body || message?.body_html),
    });

    // Log to Supabase for debugging
    try {
      const admin = createAdminClient();
      const { error: logErr } = await admin.from('webhook_debug_logs').insert({
        payload_keys: Object.keys(payload).join(','),
        message_keys: message ? Object.keys(message).join(',') : 'no message',
        has_body: !!(message?.text || message?.text_body || message?.body_plain),
        raw_preview: JSON.stringify(payload).substring(0, 2000),
      });
      if (logErr) console.warn('[INBOUND] Debug log insert failed (table may not exist):', logErr.message);
    } catch {}

    if (!eventType) {
      return NextResponse.json({ error: 'Missing event_type' }, { status: 400 });
    }

    if (eventType !== 'message.received') {
      return NextResponse.json({ received: true, ignored: true, eventType });
    }

    if (!isObject(payload.message)) {
      return NextResponse.json({ error: 'Missing message payload' }, { status: 400 });
    }

    // Enrich message body from AgentMail API if webhook didn't include it
    const enrichedMessage = await enrichMessageBody(payload.message as Record<string, unknown>);
    const enrichedPayload = { ...payload, message: enrichedMessage };

    // Rate limit by sender email
    const sender = extractSenderForRateLimit(enrichedPayload);
    if (isRateLimited(`agentmail:${sender}:bill-email`, 50, 60 * 60 * 1000)) {
      console.warn('[INBOUND] Rate limit exceeded', { sender });
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const result = await handleInboundEmail(enrichedPayload);

    console.log('[INBOUND] Webhook processed', {
      ok: result.ok,
      status: result.status,
      error: result.ok ? undefined : result.error,
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
