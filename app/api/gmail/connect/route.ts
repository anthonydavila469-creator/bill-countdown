import { createClient } from '@/lib/supabase/server';
import { getGmailAuthUrl } from '@/lib/gmail/client';
import { NextResponse } from 'next/server';

// GET /api/gmail/connect - Start Gmail OAuth flow
export async function GET() {
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

    // Generate OAuth URL
    const authUrl = getGmailAuthUrl();

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error starting Gmail OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to start Gmail OAuth' },
      { status: 500 }
    );
  }
}
