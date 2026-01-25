import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { extractCandidates } from '@/lib/bill-extraction';
import { preprocessEmail } from '@/lib/bill-extraction';

// GET /api/debug/test-email?subject=Best Buy
// Test why a specific email was rejected
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('subject') || 'Best Buy';

    // Find the email
    const { data: email } = await supabase
      .from('emails_raw')
      .select('*')
      .eq('user_id', user.id)
      .ilike('subject', `%${searchTerm}%`)
      .single();

    if (!email) {
      return NextResponse.json({ error: `No email found with subject containing "${searchTerm}"` }, { status: 404 });
    }

    // Test the extraction pipeline on this email
    const { cleanedText } = preprocessEmail(
      email.body_plain,
      email.body_html
    );

    const candidates = extractCandidates(
      email.from_address,
      email.subject,
      cleanedText
    );

    // Check for existing extraction
    const { data: extraction } = await supabase
      .from('bill_extractions')
      .select('*')
      .eq('email_raw_id', email.id)
      .single();

    return NextResponse.json({
      email: {
        id: email.id,
        subject: email.subject,
        from: email.from_address,
        date: email.date_received,
        body_plain_length: email.body_plain?.length || 0,
        body_html_length: email.body_html?.length || 0,
        body_cleaned_length: cleanedText.length,
        body_preview: cleanedText.substring(0, 500),
      },
      candidateExtraction: {
        skipReason: candidates.skipReason,
        isPromotional: candidates.isPromotional,
        keywordScore: candidates.keywordScore,
        matchedKeywords: candidates.matchedKeywords,
        amountCandidates: candidates.amounts.slice(0, 5),
        dateCandidates: candidates.dates.slice(0, 5),
        nameCandidates: candidates.names.slice(0, 3),
      },
      existingExtraction: extraction ? {
        status: extraction.status,
        extracted_name: extraction.extracted_name,
        extracted_amount: extraction.extracted_amount,
        extracted_due_date: extraction.extracted_due_date,
        confidence_overall: extraction.confidence_overall,
        is_duplicate: extraction.is_duplicate,
        duplicate_reason: extraction.duplicate_reason,
      } : null,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Failed to test email', details: String(error) },
      { status: 500 }
    );
  }
}
