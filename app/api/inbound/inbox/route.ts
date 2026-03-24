import { NextResponse } from 'next/server';

import { getOrCreateInbox, getUserInbox } from '@/lib/inbound/inbox-manager';
import { createClient } from '@/lib/supabase/server';

function getDisplayName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const metadata = user.user_metadata || {};

  const displayName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof metadata.user_name === 'string' && metadata.user_name) ||
    user.email?.split('@')[0] ||
    'Duezo User';

  return displayName;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inbox = await getUserInbox(user.id);

    return NextResponse.json({
      inbox_address: inbox?.inbox_address || null,
      inbox,
    });
  } catch (error) {
    console.error('[INBOUND] Failed to fetch user inbox', error);
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inbox = await getOrCreateInbox(user.id, getDisplayName(user));

    return NextResponse.json({
      inbox_address: inbox.inbox_address,
      inbox,
    });
  } catch (error) {
    console.error('[INBOUND] Failed to create user inbox', error);
    return NextResponse.json({ error: 'Failed to create inbox' }, { status: 500 });
  }
}
