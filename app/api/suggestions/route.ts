import { createClient } from '@/lib/supabase/server';
import {
  fetchBillEmails,
  refreshAccessToken,
  extractEmailBody,
  getHeader,
} from '@/lib/gmail/client';
import { processAllBillsRateLimited } from '@/lib/ai/process-bills';
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
    const skipAI = body.skipAI ?? false; // Default to real AI extraction

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

    console.log(`[Suggestions] Gmail returned ${messages.length} messages`);

    // Filter out calendar emails and deduplicate
    const seenIds = new Set<string>();
    const emails: Array<{
      gmail_message_id: string;
      subject: string;
      from: string;
      date: string;
      body_plain: string;
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

    console.log(`[Suggestions] Processing ${filteredEmails.length} emails (${emails.length - filteredEmails.length} filtered out)`);

    // Transform to input format for new extraction pipeline
    const emailInputs = filteredEmails.map(e => ({
      id: e.gmail_message_id,
      from: e.from,
      subject: e.subject,
      body: e.body_plain,
    }));

    // Process through the new simplified extraction pipeline
    const processedBills = await processAllBillsRateLimited(emailInputs, {
      skipAI,
      concurrency: 5,
    });

    // Filter out bills more than 7 days past due
    const GRACE_PERIOD_DAYS = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - GRACE_PERIOD_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const filteredBills = processedBills.filter(bill => {
      // Keep bills without a due date (user can decide)
      if (!bill.due_date) return true;
      // Keep bills where due_date >= cutoff (within grace period or future)
      return bill.due_date >= cutoffDateStr;
    });

    // Deduplicate bills with same amount + due date (keep highest confidence)
    const deduplicatedBills = (() => {
      const seen = new Map<string, typeof filteredBills[0]>();
      for (const bill of filteredBills) {
        // Create key from amount + due_date
        const key = `${bill.amount ?? 'null'}-${bill.due_date ?? 'null'}`;
        const existing = seen.get(key);
        // Keep the bill with higher confidence, or first one if same
        if (!existing || (bill.confidence > existing.confidence)) {
          seen.set(key, bill);
        }
      }
      return Array.from(seen.values());
    })();

    // Create a map for looking up email metadata
    const emailMap = new Map(filteredEmails.map(e => [e.gmail_message_id, e]));

    // Transform to suggestion format for the frontend
    const suggestions = deduplicatedBills.map(bill => {
      const email = emailMap.get(bill.source_email_id);
      return {
        gmail_message_id: bill.source_email_id,
        name_guess: bill.name,
        amount_guess: bill.amount,
        due_date_guess: bill.due_date,
        category_guess: bill.category,
        payment_url_guess: bill.payment_url,
        confidence: bill.confidence,
        needs_review: bill.needs_review,
        review_reasons: bill.review_reasons,
        // Email metadata
        email_subject: email?.subject || '',
        email_from: email?.from || '',
        email_date: email?.date || new Date().toISOString(),
      };
    });

    // Log summary for debugging
    console.log('[Suggestions] Summary:', JSON.stringify({
      gmailFetched: messages.length,
      afterCalendarFilter: emails.length,
      alreadyAddedAsBills: addedMessageIds.size,
      ignoredSuggestions: ignoredMessageIds.size,
      sentToProcessing: filteredEmails.length,
      processedBills: processedBills.length,
      pastDueFiltered: processedBills.length - filteredBills.length,
      duplicatesRemoved: filteredBills.length - deduplicatedBills.length,
      suggestionsReturned: suggestions.length,
    }));

    return NextResponse.json({
      suggestions,
      totalEmails: emails.length,
      filteredOut: emails.length - filteredEmails.length,
      processed: filteredEmails.length,
      suggestionsReturned: suggestions.length,
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
