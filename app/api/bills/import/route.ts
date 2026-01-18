import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ParsedBill, categoryEmojis, BillCategory } from '@/types';

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

    // Transform parsed bills to database format
    const billsToInsert = parsedBills.map((bill) => ({
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
