import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isValidApnsToken, normalizeApnsToken } from '@/lib/apns/apns-sender';
import { upsertApnsToken } from '@/lib/apns/token-store';

export async function POST(request: Request) {
  try {
    const { deviceToken, userId, deviceName } = (await request.json()) as { deviceToken?: string; userId?: string; deviceName?: string };
    if (!deviceToken || !userId) {
      return NextResponse.json({ error: 'deviceToken and userId are required' }, { status: 400 });
    }

    const token = normalizeApnsToken(deviceToken);
    if (!isValidApnsToken(token)) {
      return NextResponse.json({ error: 'Malformed APNs token' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const savedToken = await upsertApnsToken(supabase, userId, token, deviceName);

    return NextResponse.json({ success: true, token_id: savedToken.id });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
