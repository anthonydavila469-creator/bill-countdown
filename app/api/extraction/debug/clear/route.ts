import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/extraction/debug/clear
 * Clear all extractions and reset email processed status for rescanning
 */
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

    // Delete all extractions for this user
    const { error: deleteError } = await supabase
      .from('bill_extractions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Failed to delete extractions:', deleteError);
      return NextResponse.json({ error: 'Failed to clear extractions' }, { status: 500 });
    }

    // Reset processed_at on all emails
    const { error: resetError } = await supabase
      .from('emails_raw')
      .update({ processed_at: null })
      .eq('user_id', user.id);

    if (resetError) {
      console.error('Failed to reset emails:', resetError);
      return NextResponse.json({ error: 'Failed to reset emails' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear error:', error);
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    );
  }
}
