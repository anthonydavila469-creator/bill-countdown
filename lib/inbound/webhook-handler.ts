import { processEmail } from '@/lib/bill-extraction';
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

/**
 * Unwrap a forwarded email to extract the original content.
 * Gmail forwards have:
 * - Signature line
 * - "---------- Forwarded message ---------"
 * - From/Date/Subject/To headers
 * - Original email body
 *
 * We strip everything before the original body so the classifier
 * sees "Electronic Statement" and "Amount Due: $78" instead of
 * "Anthony Davila ---------- Forwarded message ---------"
 */
function unwrapForwardedEmail(
  bodyPlain: string,
  bodyHtml: string,
  subject: string
): {
  bodyPlain: string;
  bodyHtml: string;
  originalFrom: string | null;
  originalSubject: string | null;
} {
  let originalFrom: string | null = null;
  let originalSubject: string | null = null;
  let unwrappedPlain = bodyPlain;
  let unwrappedHtml = bodyHtml;

  // Detect forwarded message in plain text
  const fwdMarker = bodyPlain.indexOf('---------- Forwarded message');
  if (fwdMarker !== -1) {
    const afterMarker = bodyPlain.substring(fwdMarker);

    // Extract original From
    const fromMatch = afterMarker.match(/From:\s*(?:.*<)?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?/i);
    if (fromMatch?.[1]) originalFrom = fromMatch[1].toLowerCase();

    // Extract original Subject
    const subjMatch = afterMarker.match(/Subject:\s*(.+?)(?:\n|$)/i);
    if (subjMatch?.[1]) originalSubject = subjMatch[1].trim();

    // Find the end of forwarding headers (after To: line)
    // The actual content starts after all the header lines
    const toLineMatch = afterMarker.match(/To:\s*.*(?:\n|$)/i);
    if (toLineMatch) {
      const headerEnd = afterMarker.indexOf(toLineMatch[0]) + toLineMatch[0].length;
      // Strip leading whitespace/newlines from the body
      unwrappedPlain = afterMarker.substring(headerEnd).replace(/^\s+/, '');
    } else {
      // Fallback: just take everything after the marker line
      const firstNewline = afterMarker.indexOf('\n');
      unwrappedPlain = afterMarker.substring(firstNewline + 1).replace(/^\s+/, '');
    }
  }

  // For HTML, try to extract content after the forwarding div
  if (bodyHtml) {
    // Gmail wraps forwarded content in gmail_quote divs
    const quoteStart = bodyHtml.indexOf('class="gmail_quote');
    if (quoteStart !== -1) {
      // Find the forwarding headers end — look for the last <br after the Subject/To lines
      const afterQuote = bodyHtml.substring(quoteStart);

      // Find where the actual forwarded content starts (after the headers)
      // Look for the closing of the gmail_attr div
      const attrEnd = afterQuote.indexOf('</div>', afterQuote.indexOf('gmail_attr'));
      if (attrEnd !== -1) {
        unwrappedHtml = afterQuote.substring(attrEnd + 6);
        // Remove trailing closing divs from the wrapper
        unwrappedHtml = unwrappedHtml.replace(/<\/div>\s*$/, '');
      }
    }
  }

  // Strip "Fwd: " or "Fw: " from subject
  const cleanSubject = (originalSubject || subject).replace(/^(?:Fwd?|Fw):\s*/i, '');

  return {
    bodyPlain: unwrappedPlain || bodyPlain,
    bodyHtml: unwrappedHtml || bodyHtml,
    originalFrom,
    originalSubject: cleanSubject,
  };
}

/**
 * Simple direct extraction for forwarded bills.
 * User explicitly forwarded this — we trust it's a bill.
 * Extract amount, due date, and vendor name via simple patterns.
 */
function extractBillDirect(
  bodyPlain: string,
  bodyHtml: string,
  subject: string,
  from: string
): { name: string; amount: number; dueDate: string; category: string; paymentUrl: string | null } | null {
  const text = `${subject}\n${bodyPlain}`;

  // Extract amount — look for dollar amounts near bill keywords
  const amountPatterns = [
    /(?:amount\s*due|balance\s*due|total\s*due|current\s*(?:account\s*)?balance|payment\s*amount)[:\s]*\$?([\d,]+\.?\d{0,2})/i,
    /\$([\d,]+\.\d{2})/,
  ];

  let amount: number | null = null;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      if (parsed > 0 && parsed < 100000) {
        amount = parsed;
        break;
      }
    }
  }

  // Extract due date
  const datePatterns = [
    /due\s*(?:on|date|by)?[:\s]*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i,
    /due\s*(?:on|date|by)?[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})\s*(?:due|payment)/i,
  ];

  let dueDate: string | null = null;
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      try {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 2025) {
          dueDate = parsed.toISOString().split('T')[0];
          break;
        }
      } catch { /* ignore parse errors */ }
    }
  }

  if (!amount || !dueDate) return null;

  // Extract vendor name from sender
  const fromDomain = from.match(/@([^.]+)\./)?.[1] || '';
  const vendorMap: Record<string, { name: string; category: string }> = {
    texasgasservice: { name: 'Texas Gas Service', category: 'utilities' },
    att: { name: 'AT&T', category: 'phone' },
    tmobile: { name: 'T-Mobile', category: 'phone' },
    verizon: { name: 'Verizon', category: 'phone' },
    spectrum: { name: 'Spectrum', category: 'internet' },
    comcast: { name: 'Comcast/Xfinity', category: 'internet' },
    netflix: { name: 'Netflix', category: 'subscription' },
    spotify: { name: 'Spotify', category: 'subscription' },
    chase: { name: 'Chase', category: 'credit_card' },
    capitalone: { name: 'Capital One', category: 'credit_card' },
    citi: { name: 'Citi', category: 'credit_card' },
    discover: { name: 'Discover', category: 'credit_card' },
    amex: { name: 'American Express', category: 'credit_card' },
    geico: { name: 'GEICO', category: 'insurance' },
    progressive: { name: 'Progressive', category: 'insurance' },
    statefarm: { name: 'State Farm', category: 'insurance' },
  };

  const vendor = vendorMap[fromDomain] || {
    name: fromDomain.charAt(0).toUpperCase() + fromDomain.slice(1),
    category: 'other',
  };

  // Try to extract payment URL
  const urlMatch = bodyHtml.match(/href="(https?:\/\/[^"]*(?:pay|account|bill)[^"]*)"/i)
    || bodyPlain.match(/(https?:\/\/\S*(?:pay|account|bill)\S*)/i);

  return {
    name: vendor.name,
    amount,
    dueDate,
    category: vendor.category,
    paymentUrl: urlMatch?.[1] || null,
  };
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

    // Unwrap forwarded email — strip the forwarding headers to get original content
    const unwrapped = unwrapForwardedEmail(bodyPlain, bodyHtml, extractText(message.subject));
    const originalSender = unwrapped.originalFrom || senderEmail;

    const emailSubject = unwrapped.originalSubject || extractText(message.subject);

    // For forwarded bills: use direct extraction first (fast, reliable)
    // The full pipeline has too many rejection gates for simple forwarded bills
    console.log('[INBOUND] Attempting direct extraction for forwarded bill', {
      subject: emailSubject, from: originalSender,
    });

    const directBill = extractBillDirect(unwrapped.bodyPlain, unwrapped.bodyHtml, emailSubject, originalSender);
    if (directBill) {
      const supabase = createAdminClient();
      const { data: inserted, error: insertError } = await supabase
        .from('bills')
        .insert({
          user_id: userId,
          name: directBill.name,
          amount: directBill.amount,
          due_date: directBill.dueDate,
          category: directBill.category || 'other',
          is_paid: false,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[INBOUND] Failed to insert bill directly', insertError);
      } else {
        await updateUserBillStats(userId);
        console.log('[INBOUND] Bill created via direct extraction', {
          userId, billId: inserted.id, name: directBill.name,
          amount: directBill.amount, dueDate: directBill.dueDate,
        });
        return { ok: true, status: 200, userId, senderEmail };
      }
    }

    // Even if we couldn't extract, update stats and return OK
    await updateUserBillStats(userId);
    console.log('[INBOUND] Could not extract bill details', {
      userId, senderEmail, originalSender, subject: emailSubject,
    });

    return { ok: true, status: 200, userId, senderEmail };
  } catch (error) {
    console.error('[INBOUND] Failed to handle inbound email', error);
    return { ok: false, status: 500, error: 'Failed to handle inbound email' };
  }
}
