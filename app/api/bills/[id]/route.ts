import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { scheduleNotificationsForBillWithSettings, cancelNotificationsForBill } from '@/lib/notifications/scheduler';
import type { Bill, BillCategory } from '@/types';

const VALID_CATEGORIES: BillCategory[] = [
  'utilities', 'subscription', 'rent', 'housing', 'insurance',
  'phone', 'internet', 'credit_card', 'loan', 'health', 'other',
];

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/bills/[id] - Get a single bill
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user } = await getAuthenticatedUser(request);
    const supabase = await createClient();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch bill (RLS ensures user can only see their own)
    const { data: bill, error } = await supabase
      .from('bills')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Bill not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching bill:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bill' },
        { status: 500 }
      );
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/bills/[id] - Update a bill
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user } = await getAuthenticatedUser(request);
    const supabase = await createClient();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate fields
    if (body.amount !== undefined && body.amount !== null) {
      if (typeof body.amount !== 'number' || body.amount < 0) {
        return NextResponse.json({ error: 'amount must be a number >= 0' }, { status: 400 });
      }
    }
    if (body.due_date !== undefined && body.due_date !== null) {
      if (typeof body.due_date !== 'string' || isNaN(Date.parse(body.due_date))) {
        return NextResponse.json({ error: 'due_date must be a valid ISO date string' }, { status: 400 });
      }
    }
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
      }
    }
    if (body.category !== undefined && body.category !== null) {
      if (!VALID_CATEGORIES.includes(body.category)) {
        return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 });
      }
    }

    // Update bill (RLS ensures user can only update their own)
    const { data: bill, error } = await supabase
      .from('bills')
      .update({
        name: body.name,
        amount: body.amount,
        due_date: body.due_date,
        emoji: body.emoji,
        category: body.category,
        is_paid: body.is_paid,
        paid_at: body.is_paid ? new Date().toISOString() : null,
        is_recurring: body.is_recurring,
        recurrence_interval: body.recurrence_interval,
        recurrence_day_of_month: body.recurrence_day_of_month,
        recurrence_weekday: body.recurrence_weekday,
        notes: body.notes,
        payment_url: body.payment_url,
        is_autopay: body.is_autopay,
        is_variable: body.is_variable,
        typical_min: body.typical_min,
        typical_max: body.typical_max,
        icon_key: body.icon_key,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Bill not found' },
          { status: 404 }
        );
      }
      console.error('Error updating bill:', error);
      return NextResponse.json(
        { error: 'Failed to update bill' },
        { status: 500 }
      );
    }

    // Re-schedule notifications if bill is updated (fire and forget)
    // This handles due_date changes and paid status changes
    if (bill) {
      if ((bill as Bill).is_paid) {
        // Bill is paid, cancel any pending notifications
        cancelNotificationsForBill(id).catch(err => {
          console.error('Failed to cancel notifications:', err);
        });
      } else {
        // Bill is not paid, re-schedule notifications
        scheduleNotificationsForBillWithSettings(bill as Bill).catch(err => {
          console.error('Failed to schedule notifications:', err);
        });
      }
    }

    return NextResponse.json(bill);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id] - Delete a bill
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { user } = await getAuthenticatedUser(request);
    const supabase = await createClient();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Cancel any pending notifications for this bill (fire and forget)
    cancelNotificationsForBill(id).catch(err => {
      console.error('Failed to cancel notifications for deleted bill:', err);
    });

    // Delete bill (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bill:', error);
      return NextResponse.json(
        { error: 'Failed to delete bill' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
