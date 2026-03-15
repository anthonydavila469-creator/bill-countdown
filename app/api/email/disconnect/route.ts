import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearEmailConnection } from '@/lib/email/tokens';

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clearEmailConnection(supabase, user.id);

    return NextResponse.json({
      success: true,
      message: 'Email provider disconnected successfully',
    });
  } catch (error) {
    console.error('Email disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect email provider' }, { status: 500 });
  }
}
