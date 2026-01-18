import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  fetchBillEmails,
  refreshAccessToken,
  extractEmailBody,
  extractEmailHtml,
  getHeader,
} from '@/lib/gmail/client';
import { extractPaymentLinkCandidates } from '@/lib/bill-extraction/extractPaymentLinkCandidates';
import { preprocessEmail } from '@/lib/bill-extraction/preprocessEmail';
import { extractCandidates } from '@/lib/bill-extraction/extractCandidates';

/**
 * GET /api/extraction/test-pipeline
 * Test the full extraction pipeline on one email with verbose output
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const emailIndex = parseInt(url.searchParams.get('index') || '0');

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
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 400 });
    }

    let accessToken = tokenData.access_token;

    // Refresh if needed
    const expiresAt = new Date(tokenData.expires_at).getTime();
    if (Date.now() >= expiresAt - 60000) {
      const newTokens = await refreshAccessToken(tokenData.refresh_token);
      accessToken = newTokens.access_token;
    }

    // Fetch emails
    const messages = await fetchBillEmails(accessToken, 10, 60);

    if (emailIndex >= messages.length) {
      return NextResponse.json({ error: `Only ${messages.length} emails available` }, { status: 400 });
    }

    const msg = messages[emailIndex];
    const from = getHeader(msg, 'From');
    const subject = getHeader(msg, 'Subject');
    const plainBody = extractEmailBody(msg);
    const htmlBody = extractEmailHtml(msg);

    // Step 1: Preprocess
    const { cleanedText } = preprocessEmail(plainBody || null, htmlBody || null);

    // Step 2: Extract candidates (this is where filtering happens)
    const candidates = extractCandidates(from, subject, cleanedText);

    // Step 3: Payment link extraction
    const paymentLinks = extractPaymentLinkCandidates(htmlBody || null);

    // Check if already processed
    const { data: existingEmail } = await supabase
      .from('emails_raw')
      .select('id, processed_at')
      .eq('user_id', user.id)
      .eq('gmail_message_id', msg.id)
      .single();

    const alreadyProcessed = existingEmail !== null && existingEmail.processed_at !== null;

    return NextResponse.json({
      email: {
        id: msg.id,
        from,
        subject,
        date: new Date(parseInt(msg.internalDate)).toISOString(),
        plainBodyLength: plainBody?.length || 0,
        htmlBodyLength: htmlBody?.length || 0,
      },
      preprocessing: {
        cleanedTextLength: cleanedText.length,
        cleanedTextPreview: cleanedText.substring(0, 500),
      },
      candidateExtraction: {
        isPromotional: candidates.isPromotional,
        skipReason: candidates.skipReason,
        keywordScore: candidates.keywordScore,
        amountsFound: candidates.amounts.length,
        amounts: candidates.amounts.slice(0, 5).map(a => ({
          value: a.value,
          context: a.context.substring(0, 50),
          keywordScore: a.keywordScore,
        })),
        datesFound: candidates.dates.length,
        dates: candidates.dates.slice(0, 5).map(d => ({
          value: d.value,
          context: d.context.substring(0, 50),
          keywordScore: d.keywordScore,
        })),
        namesFound: candidates.names.length,
        names: candidates.names,
      },
      paymentLinkExtraction: {
        skipReason: paymentLinks.skipReason,
        candidatesFound: paymentLinks.candidates.length,
        candidates: paymentLinks.candidates.slice(0, 5).map(c => ({
          url: c.url.substring(0, 80),
          anchorText: c.anchorText,
          score: c.score,
          domain: c.domain,
        })),
      },
      databaseStatus: {
        alreadyProcessed,
        emailRawId: existingEmail?.id || null,
      },
      willBeProcessed: !candidates.isPromotional && !candidates.skipReason,
    });
  } catch (error) {
    console.error('Test pipeline error:', error);
    return NextResponse.json({
      error: 'Pipeline test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
