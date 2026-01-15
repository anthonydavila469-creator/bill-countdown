import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/gmail/disconnect - Disconnect Gmail
export async function POST() {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete stored Gmail tokens
    const { error: deleteError } = await supabase
      .from('gmail_tokens')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting Gmail tokens:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect Gmail' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Gmail disconnected successfully',
    });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Gmail' },
      { status: 500 }
    );
  }
}
