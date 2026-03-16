import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type RegisterDeviceRequest = {
  deviceToken?: string;
  userId?: string;
};

export async function POST(request: Request) {
  try {
    const { deviceToken, userId } = (await request.json()) as RegisterDeviceRequest;

    if (!deviceToken || !userId) {
      return NextResponse.json(
        { error: 'deviceToken and userId are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('apns_tokens')
      .upsert(
        {
          user_id: userId,
          device_token: deviceToken,
          updated_at: now,
        },
        {
          onConflict: 'user_id,device_token',
        }
      )
      .select('id')
      .single();

    if (error) {
      console.error('[push/register-device] Failed to store APNs token:', error);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token_id: data.id,
    });
  } catch (error) {
    console.error('[push/register-device] Unexpected error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
