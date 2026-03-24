import { parseEmailPipeline } from '@/lib/parser/parseEmailPipeline';
import { createAdminClient } from '@/lib/supabase/admin';

type UserInboxLookup = {
  id: string;
  user_id: string;
  inbox_address: string;
  bills_received: number | null;
};

type InboundWebhookResult =
  | {
      ok: true;
      status: 200;
      userId: string;
      inboxAddress: string;
      parsed: Awaited<ReturnType<typeof parseEmailPipeline>>;
    }
  | {
      ok: false;
      status: 400 | 404 | 500;
      error: string;
      userId?: string;
      inboxAddress?: string;
    };

function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

function extractAddressFromString(value: string): string | null {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? normalizeAddress(match[0]) : null;
}

function extractAddress(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === 'string') {
    return extractAddressFromString(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractAddress(item);
      if (extracted) return extracted;
    }
    return null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      extractAddress(record.address) ||
      extractAddress(record.email) ||
      extractAddress(record.value) ||
      null
    );
  }

  return null;
}

function extractText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function extractDate(value: unknown): string {
  const text = extractText(value);
  return text || new Date().toISOString();
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

function extractFromAddress(message: Record<string, unknown>) {
  return (
    extractAddress(message.from) ||
    extractAddress(message.sender) ||
    extractAddress(message.reply_to) ||
    ''
  );
}

export function extractInboxAddress(payload: Record<string, unknown>): string | null {
  const message = (payload.message as Record<string, unknown> | undefined) || {};
  return (
    extractAddress(message.to) ||
    extractAddress(payload.to) ||
    null
  );
}

export async function findInboxByAddress(inboxAddress: string): Promise<UserInboxLookup | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_inboxes')
    .select('id, user_id, inbox_address, bills_received')
    .eq('inbox_address', normalizeAddress(inboxAddress))
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[INBOUND] Failed to look up inbox address', { inboxAddress, error });
    throw new Error('Failed to look up inbox address');
  }

  return data as UserInboxLookup | null;
}

async function markBillReceived(inbox: UserInboxLookup) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('user_inboxes')
    .update({
      bills_received: (inbox.bills_received || 0) + 1,
      last_bill_at: new Date().toISOString(),
    })
    .eq('id', inbox.id);

  if (error) {
    console.error('[INBOUND] Failed to update inbox stats', {
      inboxId: inbox.id,
      error,
    });
  }
}

export async function handleInboundEmail(payload: Record<string, unknown>): Promise<InboundWebhookResult> {
  try {
    const message = (payload.message as Record<string, unknown> | undefined) || {};
    const inboxAddress = extractInboxAddress(payload);

    if (!inboxAddress) {
      console.error('[INBOUND] Missing recipient address in inbound payload');
      return {
        ok: false,
        status: 400,
        error: 'Missing recipient address',
      };
    }

    const inbox = await findInboxByAddress(inboxAddress);
    if (!inbox) {
      console.warn('[INBOUND] No user inbox found for recipient', { inboxAddress });
      return {
        ok: false,
        status: 404,
        error: 'Inbox not found',
        inboxAddress,
      };
    }

    const parserResult = await parseEmailPipeline({
      userId: inbox.user_id,
      email: {
        gmail_message_id: extractMessageId(payload),
        subject: extractText(message.subject),
        from: extractFromAddress(message),
        date: extractDate(message.date || message.received_at || payload.created_at),
        body_plain: extractText(message.text || message.text_body || message.body_plain),
        body_html: extractText(message.html || message.html_body || message.body_html),
      },
    });

    await markBillReceived(inbox);

    return {
      ok: true,
      status: 200,
      userId: inbox.user_id,
      inboxAddress,
      parsed: parserResult,
    };
  } catch (error) {
    console.error('[INBOUND] Failed to handle inbound email', error);
    return {
      ok: false,
      status: 500,
      error: 'Failed to handle inbound email',
    };
  }
}
