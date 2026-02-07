import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { processAllBillsRateLimited } from '@/lib/ai/process-bills';
import { EmailInput } from '@/lib/ai/types';
import { ParsedBill } from '@/types';

// POST /api/ai/parse-bills - Parse emails to extract bill information
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

    // Get emails from request body
    const body = await request.json();
    const emails: Array<{
      id: string;
      subject: string;
      from: string;
      date: string;
      body: string;
    }> = body.emails;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'No emails provided' },
        { status: 400 }
      );
    }

    // Limit to 10 emails per request to manage costs
    const emailsToProcess = emails.slice(0, 10);

    // Transform to EmailInput format
    const emailInputs: EmailInput[] = emailsToProcess.map(e => ({
      id: e.id,
      from: e.from,
      subject: e.subject,
      body: e.body,
    }));

    // Process using the new extraction pipeline
    const processedBills = await processAllBillsRateLimited(emailInputs, {
      concurrency: 5,
    });

    // Transform to ParsedBill format
    const parsedBills: ParsedBill[] = processedBills.map((bill) => ({
      name: bill.name,
      amount: bill.amount,
      due_date: bill.due_date,
      category: bill.category,
      is_recurring: bill.is_recurring,
      recurrence_interval: bill.recurrence_interval,
      confidence: bill.confidence,
      source_email_id: bill.source_email_id,
    }));

    return NextResponse.json({
      bills: parsedBills,
      processed: emailsToProcess.length,
      extracted: parsedBills.length,
    });
  } catch (error) {
    console.error('AI parsing error:', error);

    return NextResponse.json(
      { error: 'Failed to parse emails' },
      { status: 500 }
    );
  }
}
