import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Shared inbox model — all users forward to the same address: duezo-bills@agentmail.to
 * We match the forwarding user by their registered email in Supabase auth.
 *
 * Why shared inbox: AgentMail free tier only allows 3 inboxes total.
 * Per-user inboxes would require a paid plan ($20/mo for 10 inboxes).
 * Shared inbox works for our scale and costs $0.
 */

const SHARED_INBOX_ADDRESS = 'duezo-bills@agentmail.to';

type UserInbox = {
  inbox_address: string;
  user_id: string;
  is_active: boolean;
  bills_received: number;
  last_bill_at: string | null;
};

/**
 * Get the shared Duezo forwarding address.
 * Every user gets the same address — we match them by their email when bills arrive.
 */
export async function getUserInbox(userId: string): Promise<UserInbox | null> {
  const supabase = createAdminClient();

  // Check if user has a record in user_inboxes (for tracking stats)
  const { data } = await supabase
    .from('user_inboxes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (data) {
    return {
      inbox_address: SHARED_INBOX_ADDRESS,
      user_id: data.user_id,
      is_active: data.is_active,
      bills_received: data.bills_received || 0,
      last_bill_at: data.last_bill_at,
    };
  }

  return null;
}

/**
 * Create or get the user's forwarding record.
 * Creates a row in user_inboxes to track per-user stats,
 * but the actual inbox address is always the shared one.
 */
export async function getOrCreateInbox(userId: string, _displayName?: string | null): Promise<UserInbox> {
  const existing = await getUserInbox(userId);
  if (existing) return existing;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_inboxes')
    .insert({
      user_id: userId,
      inbox_address: SHARED_INBOX_ADDRESS,
      agentmail_inbox_id: 'duezo-bills', // Shared inbox ID
      is_active: true,
    })
    .select('*')
    .single();

  if (error) {
    // Handle race condition — might already exist
    if (error.code === '23505') {
      const retry = await getUserInbox(userId);
      if (retry) return retry;
    }
    console.error('[INBOUND] Failed to create user inbox record', { userId, error });
    throw new Error('Failed to create inbox record');
  }

  return {
    inbox_address: SHARED_INBOX_ADDRESS,
    user_id: data.user_id,
    is_active: data.is_active,
    bills_received: data.bills_received || 0,
    last_bill_at: data.last_bill_at,
  };
}

/**
 * Look up which user forwarded an email based on the sender's email address.
 * When a user forwards a bill, Gmail/Yahoo wraps the forward — the "from" is the user's email.
 * We match that against auth.users to find the user_id.
 */
export async function findUserByEmail(email: string): Promise<string | null> {
  if (!email) return null;

  const supabase = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  // Check auth.users for matching email
  const { data: users } = await supabase.auth.admin.listUsers();

  if (!users?.users) return null;

  const match = users.users.find(
    (u) => u.email?.toLowerCase() === normalizedEmail
  );

  return match?.id || null;
}

/**
 * Get the shared inbox address (for display in UI).
 */
export function getSharedInboxAddress(): string {
  return SHARED_INBOX_ADDRESS;
}
