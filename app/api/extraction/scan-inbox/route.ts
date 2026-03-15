import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { processEmailBatch, ProcessEmailOptions } from '@/lib/bill-extraction';
import { acquireSyncLock, releaseSyncLock } from '@/lib/sync/auto-sync';
import { fetchProviderEmails } from '@/lib/email/tokens';
import { getProviderLabel, YahooImapPendingError, YAHOO_IMAP_PENDING_MESSAGE } from '@/lib/email/providers';
import { parseEmailPipeline } from '@/lib/parser/parseEmailPipeline';

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

      if (error instanceof YahooImapPendingError) {
        return NextResponse.json({
          status: 'provider_pending',
          provider: 'yahoo',
          message: YAHOO_IMAP_PENDING_MESSAGE,
          bills: [],
        }, { status: 200 });
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

    const parserResults = [];
    const legacyFallbackEmails: ProcessEmailOptions['email'][] = [];
    const parserStats = {
      deterministicAccepted: 0,
      aiVerifiedAccepted: 0,
      sentToReview: 0,
      rejected: 0,
      deferredToLegacy: 0,
    };

    for (const email of emails) {
      const parserResult = await parseEmailPipeline({
        userId: user.id,
        email,
        skipAI,
        forceReprocess,
        deferLegacyFallback: true,
      });

      parserResults.push({
        messageId: email.gmail_message_id,
        decision: parserResult.decision,
        mode: parserResult.mode,
        vendorId: parserResult.vendorId ?? null,
        templateId: parserResult.templateId ?? null,
      });

      if (parserResult.mode === 'legacy_fallback' && parserResult.reason === 'no_template_match') {
        legacyFallbackEmails.push(email);
        parserStats.deferredToLegacy++;
        continue;
      }

      if (parserResult.decision === 'accept') {
        if (parserResult.mode === 'ai_verify') {
          parserStats.aiVerifiedAccepted++;
        } else {
          parserStats.deterministicAccepted++;
        }
      } else if (parserResult.decision === 'review') {
        parserStats.sentToReview++;
      } else {
        parserStats.rejected++;
      }
    }

    const legacyResult = legacyFallbackEmails.length > 0
      ? await processEmailBatch(user.id, legacyFallbackEmails, {
          skipAI,
          forceReprocess,
        })
      : {
          totalEmails: 0,
          processed: 0,
          skipped: 0,
          errors: 0,
          autoAccepted: 0,
          needsReview: 0,
          rejected: 0,
          results: [],
        };

    console.log('[SCAN] Hybrid parser stats', {
      deterministicAccepted: parserStats.deterministicAccepted,
      aiVerifiedAccepted: parserStats.aiVerifiedAccepted,
      sentToReview: parserStats.sentToReview,
      rejected: parserStats.rejected,
      deferredToLegacy: parserStats.deferredToLegacy,
      legacyAutoAccepted: legacyResult.autoAccepted,
      legacyNeedsReview: legacyResult.needsReview,
      legacyRejected: legacyResult.rejected,
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
        deterministicAccepted: parserStats.deterministicAccepted,
        aiVerifiedAccepted: parserStats.aiVerifiedAccepted,
        sentToReview: parserStats.sentToReview,
        rejectedByParser: parserStats.rejected,
        deferredToLegacy: parserStats.deferredToLegacy,
      },
      parser: parserResults,
      legacyFallback: legacyResult,
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
