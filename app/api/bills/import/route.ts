import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ParsedBill, categoryEmojis, BillCategory } from '@/types';
import { getFallbackPaymentUrl, isValidPaymentUrl } from '@/lib/vendor-payment-urls';

// POST /api/bills/import - Import multiple parsed bills
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

    // Get bills from request body
    const body = await request.json();
    const parsedBills: ParsedBill[] = body.bills;

    console.log('Received bills to import:', JSON.stringify(parsedBills, null, 2));

    if (!parsedBills || !Array.isArray(parsedBills) || parsedBills.length === 0) {
      console.error('No bills provided or invalid format');
      return NextResponse.json(
        { error: 'No bills provided' },
        { status: 400 }
      );
    }

    // Get existing gmail_message_ids to prevent duplicates
    const gmailMessageIds = parsedBills
      .map((b) => b.source_email_id)
      .filter((id): id is string => !!id);

    let existingMessageIds = new Set<string>();
    if (gmailMessageIds.length > 0) {
      const { data: existingBills } = await supabase
        .from('bills')
        .select('gmail_message_id')
        .eq('user_id', user.id)
        .in('gmail_message_id', gmailMessageIds);

      existingMessageIds = new Set(
        (existingBills || []).map((b) => b.gmail_message_id).filter(Boolean)
      );
    }

    // Filter out bills that already exist (by gmail_message_id)
    const newBills = parsedBills.filter(
      (bill) => !bill.source_email_id || !existingMessageIds.has(bill.source_email_id)
    );

    if (newBills.length === 0) {
      return NextResponse.json({
        imported: 0,
        bills: [],
        message: 'All bills already exist',
      });
    }

    console.log(`Importing ${newBills.length} new bills (filtered out ${parsedBills.length - newBills.length} duplicates)`);

    // Transform parsed bills to database format
    const billsToInsert = newBills.map((bill) => ({
      user_id: user.id,
      name: bill.name,
      amount: bill.amount,
      due_date: bill.due_date || new Date().toISOString().split('T')[0], // Default to today if no date
      emoji: bill.category ? categoryEmojis[bill.category as BillCategory] || '📄' : '📄',
      category: bill.category,
      is_paid: false,
      is_recurring: bill.is_recurring ?? false,
      recurrence_interval: bill.recurrence_interval || null,
      source: 'gmail',
      gmail_message_id: bill.source_email_id || null,
      payment_url: (bill.payment_url && isValidPaymentUrl(bill.payment_url))
        ? bill.payment_url
        : getFallbackPaymentUrl(bill.name) || null,
      notes: null,
    }));

    console.log('Bills to insert:', JSON.stringify(billsToInsert, null, 2));

    // Insert bills into database
    const { data: insertedBills, error: insertError } = await supabase
      .from('bills')
      .insert(billsToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting bills:', insertError);
      return NextResponse.json(
        { error: 'Failed to import bills' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imported: insertedBills?.length || 0,
      bills: insertedBills,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import bills' },
      { status: 500 }
    );
  }
}
