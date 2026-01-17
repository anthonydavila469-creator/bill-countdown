import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getNextDueDate } from '@/lib/utils';
import { scheduleNotificationsForBillWithSettings, cancelNotificationsForBill } from '@/lib/notifications/scheduler';
import type { Bill } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/bills/[id]/pay - Mark a bill as paid
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Parse optional request body for custom amount
    let customAmount: number | null = null;
    try {
      const body = await request.json();
      if (body.amount !== undefined && body.amount !== null) {
        customAmount = parseFloat(body.amount);
      }
    } catch {
      // No body or invalid JSON - that's fine, use bill's amount
    }

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

    // Verify the bill belongs to the user (extra security check)
    if (bill.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if bill is already paid (prevent double-click issues)
    if (bill.is_paid) {
      return NextResponse.json(
        { error: 'Bill is already paid' },
        { status: 400 }
      );
    }

    // Check if next instance was already generated (duplicate prevention)
    if (bill.generated_next) {
      return NextResponse.json(
        { error: 'Next recurring bill already generated' },
        { status: 400 }
      );
    }

    // Mark the bill as paid and set generated_next flag if recurring
    // Use custom amount if provided, otherwise use bill's amount
    const paidAmount = customAmount !== null ? customAmount : bill.amount;
    const updateData: Record<string, unknown> = {
      is_paid: true,
      paid_at: new Date().toISOString(),
      paid_method: bill.is_autopay ? 'autopay' : 'manual',
      last_paid_amount: paidAmount,
    };

    // Set generated_next flag if this is a recurring bill
    if (bill.is_recurring && bill.recurrence_interval) {
      updateData.generated_next = true;
    }

    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update(updateData)
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
      // Calculate next due date with recurrence options
      const nextDueDate = getNextDueDate(bill.due_date, bill.recurrence_interval, {
        dayOfMonth: bill.recurrence_day_of_month,
        weekday: bill.recurrence_weekday,
      });

      // Double-check: look for an existing unpaid bill with same name and next due date
      const { data: existingBill } = await supabase
        .from('bills')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', bill.name)
        .eq('due_date', nextDueDate)
        .eq('is_paid', false)
        .single();

      // Only create if no duplicate exists
      if (!existingBill) {
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
            recurrence_day_of_month: bill.recurrence_day_of_month,
            recurrence_weekday: bill.recurrence_weekday,
            source: bill.source,
            notes: bill.notes,
            payment_url: bill.payment_url,
            is_autopay: bill.is_autopay,
            previous_amount: bill.amount, // Track previous amount for price change detection
            parent_bill_id: bill.id, // Link to parent bill
            generated_next: false, // Reset flag for new bill
            // Variable bill fields - carry forward to next instance
            is_variable: bill.is_variable,
            typical_min: bill.typical_min,
            typical_max: bill.typical_max,
            icon_key: bill.icon_key,
            // Carry forward last paid amount so it pre-fills in the modal
            last_paid_amount: paidAmount,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating next recurring bill:', createError);
          // Don't fail the request, just log the error
        } else {
          nextBill = newBill;

          // Update the paid bill's next_due_date field for history display
          await supabase
            .from('bills')
            .update({ next_due_date: nextDueDate })
            .eq('id', id);
        }
      }
    }

    // Cancel notifications for the paid bill (fire and forget)
    cancelNotificationsForBill(id).catch(err => {
      console.error('Failed to cancel notifications for paid bill:', err);
    });

    // Schedule notifications for the new recurring bill if one was created
    if (nextBill) {
      scheduleNotificationsForBillWithSettings(nextBill as Bill).catch(err => {
        console.error('Failed to schedule notifications for next bill:', err);
      });
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

// DELETE /api/bills/[id]/pay - Undo marking a bill as paid
export async function DELETE(request: Request, { params }: RouteParams) {
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

    // Verify the bill belongs to the user
    if (bill.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if bill is actually paid
    if (!bill.is_paid) {
      return NextResponse.json(
        { error: 'Bill is not paid' },
        { status: 400 }
      );
    }

    // Undo the payment - revert to unpaid state
    const { data: updatedBill, error: updateError } = await supabase
      .from('bills')
      .update({
        is_paid: false,
        paid_at: null,
        paid_method: null,
        last_paid_amount: null,
        generated_next: false,
        next_due_date: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error undoing payment:', updateError);
      return NextResponse.json(
        { error: 'Failed to undo payment' },
        { status: 500 }
      );
    }

    // If the bill was recurring and a next bill was created, we need to delete it
    // Look for the next occurrence that was created when this bill was paid
    if (bill.is_recurring && bill.recurrence_interval) {
      const nextDueDate = getNextDueDate(bill.due_date, bill.recurrence_interval, {
        dayOfMonth: bill.recurrence_day_of_month,
        weekday: bill.recurrence_weekday,
      });

      // Delete the next recurring bill if it exists, is unpaid, and was generated from this bill
      const { error: deleteError } = await supabase
        .from('bills')
        .delete()
        .eq('user_id', user.id)
        .eq('parent_bill_id', bill.id) // Only delete if it was generated from this bill
        .eq('is_paid', false);

      if (deleteError) {
        console.error('Error deleting next recurring bill:', deleteError);
        // Don't fail the request, just log the error
      }
    }

    // Re-schedule notifications for the unpaid bill (fire and forget)
    if (updatedBill) {
      scheduleNotificationsForBillWithSettings(updatedBill as Bill).catch(err => {
        console.error('Failed to schedule notifications for unpaid bill:', err);
      });
    }

    return NextResponse.json({
      bill: updatedBill,
      message: 'Payment undone successfully',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
