import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidApnsToken, normalizeApnsToken } from '@/lib/apns/apns-sender';
import { upsertApnsToken } from '@/lib/apns/token-store';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

type RegisterDeviceRequest = {
  deviceToken?: string;
  deviceName?: string;
};

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceToken, deviceName } = (await request.json()) as RegisterDeviceRequest;

    if (!deviceToken) {
      return NextResponse.json(
        { error: 'deviceToken is required' },
        { status: 400 }
      );
    }
    const userId = user.id;

    const token = normalizeApnsToken(deviceToken);
    if (!isValidApnsToken(token)) {
      return NextResponse.json({ error: 'Malformed APNs token' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const savedToken = await upsertApnsToken(supabase, userId, token, deviceName);

    return NextResponse.json({
      success: true,
      token_id: savedToken.id,
    });
  } catch (error) {
    console.error('[push/register-device] Unexpected error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
