import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/extraction/debug
 * Debug endpoint to see raw emails and extractions
 */
export async function GET() {
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

    // Get recent raw emails
    const { data: rawEmails, error: rawError } = await supabase
      .from('emails_raw')
      .select('id, gmail_message_id, subject, from_address, date_received, processed_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent extractions
    const { data: extractions, error: extractError } = await supabase
      .from('bill_extractions')
      .select(`
        id,
        status,
        extracted_name,
        extracted_amount,
        extracted_due_date,
        confidence_overall,
        payment_url,
        payment_confidence,
        candidate_payment_links,
        created_at,
        email_raw_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get count of all emails
    const { count: totalEmails } = await supabase
      .from('emails_raw')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get count of all extractions
    const { count: totalExtractions } = await supabase
      .from('bill_extractions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      user_id: user.id,
      summary: {
        total_emails: totalEmails || 0,
        total_extractions: totalExtractions || 0,
      },
      recent_emails: rawEmails || [],
      recent_extractions: extractions || [],
      errors: {
        raw: rawError?.message,
        extract: extractError?.message,
      },
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}
