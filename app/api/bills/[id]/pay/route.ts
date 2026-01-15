import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getNextDueDate } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/bills/[id]/pay - Mark a bill as paid
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the bill first
    const { data: bill, error: fetchError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Mark the bill as paid
    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error marking bill as paid:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark bill as paid' },
        { status: 500 }
      );
    }

    // If the bill is recurring, create the next occurrence
    let nextBill = null;
    if (bill.is_recurring && bill.recurrence_interval) {
      const nextDueDate = getNextDueDate(bill.due_date, bill.recurrence_interval);

      const { data: newBill, error: createError } = await supabase
        .from('bills')
        .insert({
          user_id: user.id,
          name: bill.name,
          amount: bill.amount,
          due_date: nextDueDate,
          emoji: bill.emoji,
          category: bill.category,
          is_recurring: true,
          recurrence_interval: bill.recurrence_interval,
          source: bill.source,
          notes: bill.notes,
          payment_url: bill.payment_url, // Preserve payment URL
          is_autopay: bill.is_autopay, // Preserve autopay status
          previous_amount: bill.amount, // Track previous amount for price change detection
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating next recurring bill:', createError);
        // Don't fail the request, just log the error
      } else {
        nextBill = newBill;
      }
    }

    return NextResponse.json({
      paidBill: updatedBill,
      nextBill,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
