import { createClient } from '@/lib/supabase/server';
import {
  fetchBillEmails,
  refreshAccessToken,
  extractEmailBody,
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

    // Fetch bill-related emails
    const messages = await fetchBillEmails(accessToken, maxResults, daysBack);

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

        emails.push({
          gmail_message_id: msg.id,
          subject,
          from,
          date: new Date(parseInt(msg.internalDate)).toISOString(),
          body_plain: bodyContent,
        });
      }
    }

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
      forceReprocess: false,
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
      };
    });

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
    });
  } catch (error) {
    console.error('Suggestions scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan emails for suggestions' },
      { status: 500 }
    );
  }
}
