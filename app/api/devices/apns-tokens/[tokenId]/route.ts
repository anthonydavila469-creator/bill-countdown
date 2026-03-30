import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { deactivateApnsToken } from '@/lib/apns/token-store';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ tokenId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { user } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tokenId } = await params;
    const supabase = createAdminClient();
    const deactivated = await deactivateApnsToken(supabase, user.id, tokenId);

    if (!deactivated) {
      return NextResponse.json({ error: 'APNs token not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[devices/apns-tokens][DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to deactivate APNs token' }, { status: 500 });
  }
}
