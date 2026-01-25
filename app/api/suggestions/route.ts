import { createClient } from '@/lib/supabase/server';
import {
  fetchBillEmails,
  refreshAccessToken,
  extractEmailBody,
  extractEmailHtml,
  getHeader,
} from '@/lib/gmail/client';
import { processEmailBatch } from '@/lib/bill-extraction';
import { NextResponse } from 'next/server';

// POST /api/suggestions - Scan emails using the new extraction engine
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
    const maxResults = Math.min(body.maxResults || 200, 500);
    const daysBack = Math.min(body.daysBack || 60, 180);
    const skipAI = body.skipAI ?? true; // Default to mock extraction for speed
    const forceRescan = body.forceRescan || false;

    // If force rescan, clear processed state for non-accepted extractions
    if (forceRescan) {
      console.log('[ForceRescan] Clearing processed state for user', user.id);

      // Delete non-accepted extractions
      const { error: deleteExtractionsError } = await supabase
        .from('bill_extractions')
        .delete()
        .eq('user_id', user.id)
        .in('status', ['pending', 'needs_review', 'rejected', 'not_a_bill']);

      if (deleteExtractionsError) {
        console.error('[ForceRescan] Failed to delete extractions:', deleteExtractionsError);
      }

      // Clear cached body_cleaned to force re-preprocessing with latest logic
      const { error: clearCacheError } = await supabase
        .from('emails_raw')
        .update({ body_cleaned: null, processed_at: null })
        .eq('user_id', user.id);

      if (clearCacheError) {
        console.error('[ForceRescan] Failed to clear body_cleaned cache:', clearCacheError);
      }

      console.log('[ForceRescan] Cleared processed state and body cache');
    }

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

    // Also fetch unprocessed emails from emails_raw that may have been missed
    const { data: unprocessedEmails } = await supabase
      .from('emails_raw')
      .select('*')
      .eq('user_id', user.id)
      .is('processed_at', null)
      .limit(50);

    console.log(`[Suggestions] Gmail returned ${messages.length}, unprocessed in DB: ${unprocessedEmails?.length || 0}`);

    // Filter out calendar emails and deduplicate
    const seenIds = new Set<string>();
    const emails: Array<{
      gmail_message_id: string;
      subject: string;
      from: string;
      date: string;
      body_plain: string;
      body_html?: string;
    }> = [];

    for (const msg of messages) {
      if (!seenIds.has(msg.id)) {
        seenIds.add(msg.id);
        const from = getHeader(msg, 'From');
        const subject = getHeader(msg, 'Subject');

        // Skip Google Calendar emails
        const fromLower = from.toLowerCase();
        if (
          fromLower.includes('calendar-notification@google.com') ||
          fromLower.includes('calendar@google.com') ||
          fromLower.includes('noreply@google.com/calendar')
        ) {
          continue;
        }

        const bodyContent = extractEmailBody(msg);
        const htmlContent = extractEmailHtml(msg);

        emails.push({
          gmail_message_id: msg.id,
          subject,
          from,
          date: new Date(parseInt(msg.internalDate)).toISOString(),
          body_plain: bodyContent,
          body_html: htmlContent,
        });
      }
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
        console.log(`[Suggestions] Adding unprocessed email: "${rawEmail.subject?.substring(0, 50)}"`);
      }
    }
    console.log(`[Suggestions] Added ${unprocessedAdded} unprocessed emails from DB`)

    // Get already-added bill gmail_message_ids to filter
    const { data: existingBills } = await supabase
      .from('bills')
      .select('gmail_message_id')
      .eq('user_id', user.id)
      .not('gmail_message_id', 'is', null);

    const addedMessageIds = new Set(
      (existingBills || []).map((b) => b.gmail_message_id)
    );

    // Get ignored suggestions
    const { data: ignoredData } = await supabase
      .from('ignored_suggestions')
      .select('gmail_message_id')
      .eq('user_id', user.id);

    const ignoredMessageIds = new Set(
      (ignoredData || []).map((i) => i.gmail_message_id)
    );

    // Filter out already-added and ignored emails
    const filteredEmails = emails.filter(
      (email) =>
        !addedMessageIds.has(email.gmail_message_id) &&
        !ignoredMessageIds.has(email.gmail_message_id)
    );

    // Process through the new extraction pipeline
    const batchResult = await processEmailBatch(user.id, filteredEmails, {
      skipAI,
      forceReprocess: forceRescan,
    });

    // Get all pending extractions to show as suggestions
    const { data: extractions } = await supabase
      .from('bill_extractions')
      .select(`
        id,
        extracted_name,
        extracted_amount,
        extracted_due_date,
        extracted_category,
        confidence_overall,
        confidence_amount,
        confidence_due_date,
        evidence_snippets,
        is_duplicate,
        duplicate_reason,
        status,
        created_at,
        email_raw_id,
        payment_url,
        payment_confidence,
        emails_raw (
          gmail_message_id,
          subject,
          from_address,
          date_received
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['needs_review', 'pending'])
      .order('confidence_overall', { ascending: false })
      .limit(100);

    // Transform to suggestion format for the frontend
    const suggestions = (extractions || []).map((ext) => {
      // emails_raw is returned as an array from Supabase nested select
      const emailRaw = Array.isArray(ext.emails_raw) ? ext.emails_raw[0] : ext.emails_raw;

      // Check if this is a "view online" bill (has payment link but missing amount/date)
      const isViewOnlineBill = ext.payment_url && ext.payment_confidence >= 0.8 &&
        (ext.extracted_amount === null || ext.extracted_due_date === null);

      return {
        id: ext.id,
        gmail_message_id: emailRaw?.gmail_message_id || ext.id,
        name_guess: ext.extracted_name || 'Unknown Bill',
        amount_guess: ext.extracted_amount,
        due_date_guess: ext.extracted_due_date,
        category_guess: ext.extracted_category,
        confidence: ext.confidence_overall || 0.5,
        confidence_amount: ext.confidence_amount,
        confidence_due_date: ext.confidence_due_date,
        is_duplicate: ext.is_duplicate,
        duplicate_reason: ext.duplicate_reason,
        evidence_snippets: ext.evidence_snippets,
        email_subject: emailRaw?.subject || '',
        email_from: emailRaw?.from_address || '',
        email_date: emailRaw?.date_received || ext.created_at,
        email_snippet: '',
        status: ext.status,
        // Payment link info
        payment_url: ext.payment_url,
        payment_confidence: ext.payment_confidence,
        is_view_online_bill: isViewOnlineBill,
      };
    });

    // Log summary for debugging
    console.log('[Suggestions] Summary:', JSON.stringify({
      gmailFetched: messages.length,
      unprocessedFromDb: unprocessedEmails?.length || 0,
      unprocessedAdded,
      afterCalendarFilter: emails.length,
      alreadyAddedAsBills: addedMessageIds.size,
      ignoredSuggestions: ignoredMessageIds.size,
      sentToProcessing: filteredEmails.length,
      processed: batchResult.processed,
      skipped: batchResult.skipped,
      rejected: batchResult.rejected,
      needsReview: batchResult.needsReview,
      autoAccepted: batchResult.autoAccepted,
      debugSummary: batchResult.debugSummary,
    }));

    return NextResponse.json({
      suggestions,
      totalEmails: emails.length,
      filteredOut: emails.length - filteredEmails.length,
      processed: batchResult.processed,
      autoAccepted: batchResult.autoAccepted,
      needsReview: batchResult.needsReview,
      rejected: batchResult.rejected,
      skipped: batchResult.skipped,
      scannedAt: new Date().toISOString(),
      // Include debug info for troubleshooting
      debug: {
        gmailFetched: messages.length,
        unprocessedFromDb: unprocessedEmails?.length || 0,
        unprocessedAdded,
        alreadyAddedAsBills: addedMessageIds.size,
        ignoredSuggestions: ignoredMessageIds.size,
        sentToProcessing: filteredEmails.length,
        ...batchResult.debugSummary,
      },
    });
  } catch (error) {
    console.error('Suggestions scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan emails for suggestions' },
      { status: 500 }
    );
  }
}
