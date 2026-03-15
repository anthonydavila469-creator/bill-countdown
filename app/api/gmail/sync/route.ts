import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isRateLimited } from '@/lib/rate-limit';
import { fetchProviderEmails, getEmailConnection } from '@/lib/email/tokens';
import { getProviderLabel } from '@/lib/email/providers';

// POST /api/gmail/sync - Fetch bill-related emails from Gmail
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

    // Rate limit: 10 syncs per minute per user
    if (isRateLimited(`gmail-sync:${user.id}`, 10, 60_000)) {
      return NextResponse.json(
        { error: 'Too many sync requests. Please wait a moment.' },
        { status: 429 }
      );
    }

    const connection = await getEmailConnection(supabase, user.id);
    if (!connection) {
      return NextResponse.json(
        { error: 'Gmail not connected' },
        { status: 400 }
      );
    }
    const { emails } = await fetchProviderEmails(supabase, user.id, { maxResults: 20 });

    // Update last sync time
    await supabase
      .from('gmail_tokens')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return NextResponse.json({
      emails,
      count: emails.length,
      provider: connection.email_provider,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Gmail sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails' },
      { status: 500 }
    );
  }
}

// GET /api/gmail/sync - Get sync status
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

    const tokenData = await getEmailConnection(supabase, user.id);
    if (!tokenData) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      email: tokenData.email,
      provider: tokenData.email_provider,
      providerLabel: getProviderLabel(tokenData.email_provider),
      lastSyncAt: tokenData.last_sync_at,
      connectedAt: tokenData.created_at,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
