import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { processEmail, ProcessEmailOptions } from '@/lib/bill-extraction';

/**
 * POST /api/extraction/process-email
 * Process a single email through the extraction pipeline
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

    // Parse request body
    const body = await request.json();

    if (!body.email) {
      return NextResponse.json(
        { error: 'Missing email data' },
        { status: 400 }
      );
    }

    const email = body.email as ProcessEmailOptions['email'];

    // Validate required fields
    if (!email.gmail_message_id || !email.subject || !email.from || !email.date) {
      return NextResponse.json(
        { error: 'Missing required email fields (gmail_message_id, subject, from, date)' },
        { status: 400 }
      );
    }

    // Process the email
    const result = await processEmail({
      userId: user.id,
      email,
      skipAI: body.skipAI || false,
      forceReprocess: body.forceReprocess || false,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Process email error:', error);
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}
