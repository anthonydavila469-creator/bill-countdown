import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

type RegisterPushBody = {
  deviceToken?: string;
  userId?: string;
};

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as RegisterPushBody;
    const deviceToken = body.deviceToken?.trim();

    if (!deviceToken) {
      return NextResponse.json({ error: 'Missing deviceToken' }, { status: 400 });
    }

    if (body.userId && body.userId !== user.id) {
      return NextResponse.json({ error: 'userId does not match authenticated user' }, { status: 403 });
    }

    const admin = createAdminClient();
    const timestamp = new Date().toISOString();
    const { error } = await admin
      .from('apns_tokens')
      .upsert(
        {
          user_id: user.id,
          device_token: deviceToken,
          updated_at: timestamp,
        },
        {
          onConflict: 'device_token',
        }
      );

    if (error) {
      console.error('Failed to register APNs token:', error);
      return NextResponse.json({ error: 'Failed to register device token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected push registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
