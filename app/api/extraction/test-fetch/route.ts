import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  fetchBillEmails,
  refreshAccessToken,
  extractEmailBody,
  extractEmailHtml,
  getHeader,
} from '@/lib/gmail/client';

/**
 * GET /api/extraction/test-fetch
 * Test endpoint to see what emails Gmail returns before any processing
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Gmail tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({
        error: 'Gmail not connected',
        details: tokenError?.message,
      }, { status: 400 });
    }

    let accessToken = tokenData.access_token;

    // Refresh token if needed
    const expiresAt = new Date(tokenData.expires_at).getTime();
    if (Date.now() >= expiresAt - 60000) {
      try {
        const newTokens = await refreshAccessToken(tokenData.refresh_token);
        accessToken = newTokens.access_token;

        await supabase
          .from('gmail_tokens')
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(newTokens.expires_at).toISOString(),
          })
          .eq('user_id', user.id);
      } catch (e) {
        return NextResponse.json({
          error: 'Token refresh failed',
          details: e instanceof Error ? e.message : 'Unknown error',
        }, { status: 401 });
      }
    }

    // Fetch emails - just 10 for testing
    const messages = await fetchBillEmails(accessToken, 10, 60);

    // Transform to see what we got
    const emailSummaries = messages.map((msg) => {
      const from = getHeader(msg, 'From');
      const subject = getHeader(msg, 'Subject');
      const plainBody = extractEmailBody(msg);
      const htmlBody = extractEmailHtml(msg);

      return {
        id: msg.id,
        from,
        subject,
        date: new Date(parseInt(msg.internalDate)).toISOString(),
        snippet: msg.snippet?.substring(0, 100),
        hasPlainBody: !!plainBody && plainBody.length > 0,
        plainBodyLength: plainBody?.length || 0,
        hasHtmlBody: !!htmlBody && htmlBody.length > 0,
        htmlBodyLength: htmlBody?.length || 0,
        htmlPreview: htmlBody?.substring(0, 200),
      };
    });

    return NextResponse.json({
      gmail_connected: true,
      token_email: tokenData.email,
      emails_fetched: messages.length,
      emails: emailSummaries,
    });
  } catch (error) {
    console.error('Test fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch emails',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
