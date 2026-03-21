import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidApnsToken, normalizeApnsToken } from '@/lib/apns/apns-sender';
import { upsertApnsToken } from '@/lib/apns/token-store';

type RegisterDeviceRequest = {
  deviceToken?: string;
  userId?: string;
  deviceName?: string;
};

export async function POST(request: Request) {
  try {
    const { deviceToken, userId, deviceName } = (await request.json()) as RegisterDeviceRequest;

    if (!deviceToken || !userId) {
      return NextResponse.json(
        { error: 'deviceToken and userId are required' },
        { status: 400 }
      );
    }

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
