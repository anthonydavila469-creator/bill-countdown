import { createAdminClient } from '@/lib/supabase/admin';

type UserInbox = {
  id: string;
  user_id: string;
  inbox_address: string;
  agentmail_inbox_id: string;
  created_at: string;
  is_active: boolean;
  bills_received: number;
  last_bill_at: string | null;
};

type AgentMailCreateInboxResponse = {
  id?: string;
  inbox_id?: string;
  address?: string;
  email?: string;
  email_address?: string;
  inbox_address?: string;
};

function buildInboxUsername(userId: string) {
  return `duezo-${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase()}`;
}

function getAgentMailApiKey() {
  const apiKey = process.env.AGENTMAIL_API_KEY;

  if (!apiKey) {
    throw new Error('Missing AGENTMAIL_API_KEY');
  }

  return apiKey;
}

function parseAgentMailInbox(response: AgentMailCreateInboxResponse) {
  const agentmailInboxId = response.id || response.inbox_id;
  const inboxAddress =
    response.address ||
    response.email ||
    response.email_address ||
    response.inbox_address;

  if (!agentmailInboxId || !inboxAddress) {
    throw new Error('AgentMail response missing inbox id or address');
  }

  return {
    agentmailInboxId,
    inboxAddress,
  };
}

export async function getUserInbox(userId: string): Promise<UserInbox | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_inboxes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[INBOUND] Failed to fetch user inbox', { userId, error });
    throw new Error('Failed to fetch user inbox');
  }

  return data as UserInbox | null;
}

export async function createUserInbox(userId: string, displayName?: string | null): Promise<UserInbox> {
  const username = buildInboxUsername(userId);
  const response = await fetch('https://api.agentmail.to/v0/inboxes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAgentMailApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      display_name: displayName || username,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('[INBOUND] AgentMail inbox creation failed', {
      userId,
      status: response.status,
      body: errorText,
    });
    throw new Error(`Failed to create AgentMail inbox (${response.status})`);
  }

  const json = (await response.json()) as AgentMailCreateInboxResponse;
  const { agentmailInboxId, inboxAddress } = parseAgentMailInbox(json);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('user_inboxes')
    .insert({
      user_id: userId,
      inbox_address: inboxAddress,
      agentmail_inbox_id: agentmailInboxId,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[INBOUND] Failed to store inbox mapping', {
      userId,
      inboxAddress,
      agentmailInboxId,
      error,
    });
    throw new Error('Failed to persist user inbox');
  }

  return data as UserInbox;
}

export async function getOrCreateInbox(userId: string, displayName?: string | null): Promise<UserInbox> {
  const existingInbox = await getUserInbox(userId);

  if (existingInbox) {
    return existingInbox;
  }

  return createUserInbox(userId, displayName);
}
