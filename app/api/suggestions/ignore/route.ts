import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/suggestions/ignore - Add a suggestion to the ignore list
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    if (!body.gmail_message_id) {
      return NextResponse.json(
        { error: 'gmail_message_id is required' },
        { status: 400 }
      );
    }

    // Insert into ignored_suggestions (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('ignored_suggestions')
      .upsert(
        {
          user_id: user.id,
          gmail_message_id: body.gmail_message_id,
          ignored_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,gmail_message_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error ignoring suggestion:', error);
      return NextResponse.json(
        { error: 'Failed to ignore suggestion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ignored: data,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/suggestions/ignore - Remove a suggestion from the ignore list (restore it)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const gmailMessageId = searchParams.get('gmail_message_id');

    if (!gmailMessageId) {
      return NextResponse.json(
        { error: 'gmail_message_id query parameter is required' },
        { status: 400 }
      );
    }

    // Delete from ignored_suggestions
    const { error } = await supabase
      .from('ignored_suggestions')
      .delete()
      .eq('user_id', user.id)
      .eq('gmail_message_id', gmailMessageId);

    if (error) {
      console.error('Error restoring suggestion:', error);
      return NextResponse.json(
        { error: 'Failed to restore suggestion' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restored: gmailMessageId,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
