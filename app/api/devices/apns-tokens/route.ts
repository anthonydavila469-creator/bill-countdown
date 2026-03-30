import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { listApnsTokensForUser } from '@/lib/apns/token-store';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const tokens = await listApnsTokensForUser(supabase, user.id);

    return NextResponse.json(tokens);
  } catch (error) {
    console.error('[devices/apns-tokens][GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to load APNs tokens' }, { status: 500 });
  }
}
