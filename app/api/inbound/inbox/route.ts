import { NextResponse } from 'next/server';
import { getOrCreateInbox, getUserInbox } from '@/lib/inbound/inbox-manager';
import { createClient } from '@/lib/supabase/server';

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
      inbox_address: inbox?.inbox_address || 'duezo-bills@agentmail.to',
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

    const inbox = await getOrCreateInbox(user.id);

    return NextResponse.json({
      inbox_address: inbox.inbox_address,
      inbox,
    });
  } catch (error) {
    console.error('[INBOUND] Failed to create user inbox', error);
    return NextResponse.json({ error: 'Failed to create inbox' }, { status: 500 });
  }
}
