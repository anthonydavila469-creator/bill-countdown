import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/notifications/feed - Fetch user's in-app notifications (last 30 days)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: notifications, error } = await supabase
      .from('bill_notifications_queue')
      .select(`
        id,
        bill_id,
        scheduled_for,
        channel,
        status,
        sent_at,
        read_at,
        message,
        created_at,
        bills (
          name,
          emoji,
          amount,
          due_date,
          icon_key,
          category
        )
      `)
      .eq('user_id', user.id)
      .eq('channel', 'in_app')
      .gte('scheduled_for', thirtyDaysAgo.toISOString())
      .order('scheduled_for', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notification feed:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    const unreadCount = (notifications ?? []).filter(n => !n.read_at).length;

    return NextResponse.json({ notifications: notifications ?? [], unreadCount });
  } catch (error) {
    console.error('Feed API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/notifications/feed - Mark notifications as read
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, markAll } = body as { ids?: string[]; markAll?: boolean };

    const now = new Date().toISOString();

    if (markAll) {
      const { error } = await supabase
        .from('bill_notifications_queue')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .eq('channel', 'in_app')
        .is('read_at', null);

      if (error) {
        console.error('Error marking all as read:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }
    } else if (ids && ids.length > 0) {
      const { error } = await supabase
        .from('bill_notifications_queue')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .in('id', ids);

      if (error) {
        console.error('Error marking as read:', error);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Provide ids or markAll' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feed PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
