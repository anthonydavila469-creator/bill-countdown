import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { isValidApnsToken, normalizeApnsToken } from '@/lib/apns/apns-sender';
import { upsertApnsToken } from '@/lib/apns/token-store';
import { createAdminClient } from '@/lib/supabase/admin';

type RegisterApnsTokenRequest = {
  token?: string;
  deviceName?: string;
};

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as RegisterApnsTokenRequest;
    const token = typeof body.token === 'string' ? normalizeApnsToken(body.token) : '';

    if (!token || !isValidApnsToken(token)) {
      return NextResponse.json({ error: 'Malformed APNs token' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const savedToken = await upsertApnsToken(supabase, user.id, token, body.deviceName);

    return NextResponse.json({
      success: true,
      tokenId: savedToken.id,
      registeredAt: savedToken.created_at,
    });
  } catch (error) {
    console.error('[devices/register-apns-token] Unexpected error:', error);
    return NextResponse.json({ error: 'Failed to register APNs token' }, { status: 500 });
  }
}
