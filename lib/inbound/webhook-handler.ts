import { parseEmailPipeline } from '@/lib/parser/parseEmailPipeline';
import { createAdminClient } from '@/lib/supabase/admin';
import { findUserByEmail } from '@/lib/inbound/inbox-manager';

/**
 * Shared inbox webhook handler.
 *
 * Flow:
 * 1. User forwards a bill email to duezo-bills@agentmail.to
 * 2. AgentMail sends webhook to /api/inbound/bill-email
 * 3. We extract the original sender's email (the user who forwarded)
 * 4. Match that email to a Duezo user account
 * 5. Run the bill through our existing parser
 * 6. Bill appears on their dashboard
 */

type InboundWebhookResult =
  | {
      ok: true;
      status: 200;
      userId: string;
      senderEmail: string;
      parsed: Awaited<ReturnType<typeof parseEmailPipeline>>;
    }
  | {
      ok: false;
      status: 400 | 404 | 500;
      error: string;
      senderEmail?: string;
    };

function extractText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function extractDate(value: unknown): string {
  const text = extractText(value);
  return text || new Date().toISOString();
}

function extractAddressFromValue(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0].trim().toLowerCase() : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractAddressFromValue(item);
      if (extracted) return extracted;
    }
    return null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      extractAddressFromValue(record.address) ||
      extractAddressFromValue(record.email) ||
      extractAddressFromValue(record.value) ||
      null
    );
  }

  return null;
}

function extractMessageId(payload: Record<string, unknown>) {
  return (
    extractText(payload.message_id) ||
    extractText(payload.id) ||
    extractText((payload.message as Record<string, unknown> | undefined)?.message_id) ||
    extractText((payload.message as Record<string, unknown> | undefined)?.id) ||
    crypto.randomUUID()
  );
}

/**
 * Extract the sender (forwarder) email from the webhook payload.
 * When someone forwards an email, the "from" field is THEIR email address.
 */
function extractSenderEmail(message: Record<string, unknown>): string | null {
  return (
    extractAddressFromValue(message.from) ||
    extractAddressFromValue(message.sender) ||
    extractAddressFromValue(message.reply_to) ||
    null
  );
}

/**
 * Try to extract the ORIGINAL sender from a forwarded email.
 * Gmail forwards typically include "---------- Forwarded message ----------"
 * followed by "From: original@sender.com"
 */
function extractOriginalBillSender(body: string): string | null {
  if (!body) return null;

  // Look for forwarded message headers
  const forwardedMatch = body.match(
    /(?:Forwarded message|Begin forwarded message)[\s\S]*?From:\s*(?:.*<)?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i
  );
  if (forwardedMatch?.[1]) return forwardedMatch[1].toLowerCase();

  return null;
}

async function updateUserBillStats(userId: string) {
  const supabase = createAdminClient();

  // Try to increment the user's bill count
  const { data: existing } = await supabase
    .from('user_inboxes')
    .select('id, bills_received')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('user_inboxes')
      .update({
        bills_received: (existing.bills_received || 0) + 1,
        last_bill_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  }
}

export async function handleInboundEmail(payload: Record<string, unknown>): Promise<InboundWebhookResult> {
  try {
    const message = (payload.message as Record<string, unknown> | undefined) || {};
    const senderEmail = extractSenderEmail(message);
    const bodyPlain = extractText(message.text || message.text_body || message.body_plain);
    const bodyHtml = extractText(message.html || message.html_body || message.body_html);

    if (!senderEmail) {
      console.error('[INBOUND] No sender email in webhook payload');
      return { ok: false, status: 400, error: 'Missing sender email' };
    }

    console.log('[INBOUND] Processing forwarded bill email', {
      from: senderEmail,
      subject: extractText(message.subject),
    });

    // Try to match the sender to a Duezo user
    const userId = await findUserByEmail(senderEmail);

    if (!userId) {
      console.warn('[INBOUND] No Duezo user found for sender', { senderEmail });
      return {
        ok: false,
        status: 404,
        error: 'No Duezo account found for this email address',
        senderEmail,
      };
    }

    // Determine the original bill sender (from the forwarded content)
    const originalSender = extractOriginalBillSender(bodyPlain || bodyHtml) || senderEmail;

    // Run through the existing parser
    const parserResult = await parseEmailPipeline({
      userId,
      email: {
        gmail_message_id: extractMessageId(payload),
        subject: extractText(message.subject),
        from: originalSender,
        date: extractDate(message.date || message.received_at || payload.created_at),
        body_plain: bodyPlain,
        body_html: bodyHtml,
      },
    });

    // Update bill stats
    await updateUserBillStats(userId);

    console.log('[INBOUND] Bill processed successfully', {
      userId,
      senderEmail,
      originalSender,
      subject: extractText(message.subject),
    });

    return {
      ok: true,
      status: 200,
      userId,
      senderEmail,
      parsed: parserResult,
    };
  } catch (error) {
    console.error('[INBOUND] Failed to handle inbound email', error);
    return { ok: false, status: 500, error: 'Failed to handle inbound email' };
  }
}
