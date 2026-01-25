import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/debug/stats - Get diagnostic stats about bills and extractions
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

    // Get bill count
    const { count: billCount } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get bills by source
    const { data: billsBySource } = await supabase
      .from('bills')
      .select('source, name, gmail_message_id')
      .eq('user_id', user.id);

    // Get emails_raw count
    const { count: emailsRawCount } = await supabase
      .from('emails_raw')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get extractions by status
    const { data: extractionsByStatus } = await supabase
      .from('bill_extractions')
      .select('status')
      .eq('user_id', user.id);

    const statusCounts: Record<string, number> = {};
    for (const e of extractionsByStatus || []) {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    }

    // Get ignored suggestions count
    const { count: ignoredCount } = await supabase
      .from('ignored_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get recent rejected extractions (last 10)
    const { data: recentRejected } = await supabase
      .from('bill_extractions')
      .select(`
        extracted_name,
        status,
        duplicate_reason,
        emails_raw (subject, from_address)
      `)
      .eq('user_id', user.id)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get all emails_raw to see what was processed
    const { data: allEmails } = await supabase
      .from('emails_raw')
      .select('subject, from_address, processed_at')
      .eq('user_id', user.id)
      .order('date_received', { ascending: false })
      .limit(50);

    return NextResponse.json({
      user_id: user.id,
      bills: {
        total: billCount || 0,
        list: billsBySource?.map(b => ({
          name: b.name,
          source: b.source,
          hasGmailId: !!b.gmail_message_id,
        })) || [],
      },
      emails_raw: {
        total: emailsRawCount || 0,
      },
      extractions: {
        byStatus: statusCounts,
      },
      ignored_suggestions: ignoredCount || 0,
      recent_rejected: recentRejected?.map(r => ({
        name: r.extracted_name,
        status: r.status,
        duplicate_reason: r.duplicate_reason,
        subject: (r.emails_raw as any)?.subject?.substring(0, 50),
        from: (r.emails_raw as any)?.from_address,
      })) || [],
      all_processed_emails: allEmails?.map(e => ({
        subject: e.subject?.substring(0, 60),
        from: e.from_address?.substring(0, 40),
        processed: !!e.processed_at,
      })) || [],
    });
  } catch (error) {
    console.error('Debug stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get debug stats' },
      { status: 500 }
    );
  }
}
