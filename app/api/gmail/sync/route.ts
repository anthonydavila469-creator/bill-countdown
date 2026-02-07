import { createClient } from '@/lib/supabase/server';
import {
  fetchBillEmails,
  refreshAccessToken,
  extractEmailBody,
  getHeader,
  GmailMessage,
} from '@/lib/gmail/client';
import { NextResponse } from 'next/server';

interface EmailData {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

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

    // Get stored Gmail tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Gmail not connected' },
        { status: 400 }
      );
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    const expiresAt = new Date(tokenData.expires_at).getTime();
    if (Date.now() >= expiresAt - 60000) {
      // Refresh if expiring within 1 minute
      try {
        const newTokens = await refreshAccessToken(tokenData.refresh_token);
        accessToken = newTokens.access_token;

        // Update stored token
        await supabase
          .from('gmail_tokens')
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(newTokens.expires_at).toISOString(),
          })
          .eq('user_id', user.id);
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        return NextResponse.json(
          { error: 'Failed to refresh Gmail access. Please reconnect Gmail.' },
          { status: 401 }
        );
      }
    }

    // Fetch bill-related emails
    const messages = await fetchBillEmails(accessToken, 20);

    // Transform messages to a simpler format
    const emails: EmailData[] = messages.map((msg: GmailMessage) => ({
      id: msg.id,
      subject: getHeader(msg, 'Subject'),
      from: getHeader(msg, 'From'),
      date: new Date(parseInt(msg.internalDate)).toISOString(),
      snippet: msg.snippet,
      body: extractEmailBody(msg),
    }));

    // Update last sync time
    await supabase
      .from('gmail_tokens')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return NextResponse.json({
      emails,
      count: emails.length,
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

    // Get stored Gmail tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('email, last_sync_at, created_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        connected: false,
      });
    }

    return NextResponse.json({
      connected: true,
      email: tokenData.email,
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
