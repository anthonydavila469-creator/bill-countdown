import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/notifications/register-device
// Saves an iOS APNs device token for the authenticated user
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { token: string; deviceId?: string };

    if (!body.token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    // Upsert — one row per user+token combo
    const { error } = await supabase
      .from('apns_tokens')
      .upsert({
        user_id: user.id,
        token: body.token,
        device_id: body.deviceId ?? null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,token',
      });

    if (error) {
      console.error('Error saving APNs token:', error);
      return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/notifications/register-device
// Removes a device token (called on sign out)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as { token: string };
    if (!body.token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    await supabase
      .from('apns_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', body.token);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
