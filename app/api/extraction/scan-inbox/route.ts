import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { processEmailBatch, ProcessEmailOptions } from '@/lib/bill-extraction';
import { acquireSyncLock, releaseSyncLock } from '@/lib/sync/auto-sync';
import { fetchProviderEmails } from '@/lib/email/tokens';
import { getProviderLabel } from '@/lib/email/providers';

/**
 * POST /api/extraction/scan-inbox
 * Batch scan Gmail inbox for bill emails
 */
export async function POST(request: Request) {
  let lockAcquired = false;
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

    // Try to acquire sync lock (prevent concurrent syncs)
    lockAcquired = await acquireSyncLock(adminClient, user.id);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: 'sync_in_progress', message: 'A sync is already running. Please wait and try again.' },
        { status: 423 }
      );
    }

    // Parse request body for optional parameters
    const body = await request.json().catch(() => ({}));
    const maxResults = Math.min(body.maxResults || 100, 500);
    const daysBack = Math.min(body.daysBack || 60, 180);
    const skipAI = body.skipAI || false;
    const forceReprocess = body.forceReprocess || false;

    let fetched;
    try {
      fetched = await fetchProviderEmails(supabase, user.id, { maxResults, daysBack });
    } catch (error) {
      if (lockAcquired && userId) {
        await releaseSyncLock(adminClient, userId);
      }

      if (error instanceof Error && error.message === 'EMAIL_NOT_CONNECTED') {
        return NextResponse.json(
          { error: 'Gmail not connected', code: 'GMAIL_NOT_CONNECTED' },
          { status: 400 }
        );
      }

      throw error;
    }

    const messages = fetched.emails;
    console.log(`[SCAN] ${getProviderLabel(fetched.connection.email_provider)} returned ${messages.length} messages`);

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

      const from = msg.from;
      const subject = msg.subject;

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

      emails.push({
        gmail_message_id: msg.id,
        subject,
        from,
        date: msg.date,
        body_plain: msg.body,
        body_html: msg.body_html,
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

    // Release lock before returning
    if (lockAcquired && userId) {
      await releaseSyncLock(adminClient, userId);
    }

    return NextResponse.json({
      summary: {
        fetchedFromGmail: messages.length,
        provider: fetched.connection.email_provider,
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

    // Release lock on error
    if (lockAcquired && userId) {
      const adminClient = createAdminClient();
      await releaseSyncLock(adminClient, userId);
    }

    return NextResponse.json(
      { error: 'Failed to scan inbox' },
      { status: 500 }
    );
  }
}
