import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  fetchBillEmails,
  refreshAccessToken,
  extractEmailBody,
  extractEmailHtml,
  getHeader,
} from '@/lib/gmail/client';
import { processEmailBatch, ProcessEmailOptions } from '@/lib/bill-extraction';

/**
 * POST /api/extraction/scan-inbox
 * Batch scan Gmail inbox for bill emails
 */
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

    // Parse request body for optional parameters
    const body = await request.json().catch(() => ({}));
    const maxResults = Math.min(body.maxResults || 100, 500);
    const daysBack = Math.min(body.daysBack || 60, 180);
    const skipAI = body.skipAI || false;
    const forceReprocess = body.forceReprocess || false;

    // Get stored Gmail tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Gmail not connected', code: 'GMAIL_NOT_CONNECTED' },
        { status: 400 }
      );
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    const expiresAt = new Date(tokenData.expires_at).getTime();
    if (Date.now() >= expiresAt - 60000) {
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
      } catch {
        return NextResponse.json(
          {
            error: 'Failed to refresh Gmail access. Please reconnect Gmail.',
            code: 'TOKEN_REFRESH_FAILED',
          },
          { status: 401 }
        );
      }
    }

    // Fetch bill-related emails from Gmail
    const messages = await fetchBillEmails(accessToken, maxResults, daysBack);
    console.log(`[SCAN] Gmail returned ${messages.length} messages`);

    // Also fetch unprocessed emails from emails_raw that may have been missed
    const { data: unprocessedEmails } = await supabase
      .from('emails_raw')
      .select('*')
      .eq('user_id', user.id)
      .is('processed_at', null)
      .limit(50);

    console.log(`[SCAN] Found ${unprocessedEmails?.length || 0} unprocessed emails in emails_raw`);

    // Transform messages to extraction format
    const emails: ProcessEmailOptions['email'][] = [];
    const seenIds = new Set<string>();
    let calendarSkipped = 0;

    for (const msg of messages) {
      if (seenIds.has(msg.id)) continue;
      seenIds.add(msg.id);

      const from = getHeader(msg, 'From');
      const subject = getHeader(msg, 'Subject');

      // Skip Google Calendar notification emails
      const fromLower = from.toLowerCase();
      if (
        fromLower.includes('calendar-notification@google.com') ||
        fromLower.includes('calendar@google.com') ||
        fromLower.includes('noreply@google.com/calendar')
      ) {
        calendarSkipped++;
        continue;
      }

      const body = extractEmailBody(msg);
      const htmlBody = extractEmailHtml(msg);

      emails.push({
        gmail_message_id: msg.id,
        subject,
        from,
        date: new Date(parseInt(msg.internalDate)).toISOString(),
        body_plain: body,
        body_html: htmlBody,
      });
    }

    // Add unprocessed emails from emails_raw that aren't already in the Gmail results
    let unprocessedAdded = 0;
    if (unprocessedEmails && unprocessedEmails.length > 0) {
      for (const rawEmail of unprocessedEmails) {
        if (seenIds.has(rawEmail.gmail_message_id)) continue;
        seenIds.add(rawEmail.gmail_message_id);

        // Skip Google Calendar notification emails
        const fromLower = (rawEmail.from_address || '').toLowerCase();
        if (
          fromLower.includes('calendar-notification@google.com') ||
          fromLower.includes('calendar@google.com') ||
          fromLower.includes('noreply@google.com/calendar')
        ) {
          calendarSkipped++;
          continue;
        }

        emails.push({
          gmail_message_id: rawEmail.gmail_message_id,
          subject: rawEmail.subject || '',
          from: rawEmail.from_address || '',
          date: rawEmail.date_received || new Date().toISOString(),
          body_plain: rawEmail.body_plain || '',
          body_html: rawEmail.body_html || '',
        });
        unprocessedAdded++;
      }
    }

    console.log(`[SCAN] Calendar skipped: ${calendarSkipped}, Unprocessed added: ${unprocessedAdded}, Selected for processing: ${emails.length}`);

    // Process emails in batch
    const result = await processEmailBatch(user.id, emails, {
      skipAI,
      forceReprocess,
    });

    return NextResponse.json({
      summary: {
        fetchedFromGmail: messages.length,
        unprocessedFromDb: unprocessedEmails?.length || 0,
        unprocessedAdded,
        calendarSkipped,
        selectedForProcessing: emails.length,
      },
      ...result,
      scannedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Inbox scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan inbox' },
      { status: 500 }
    );
  }
}
