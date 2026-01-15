import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/bills/[id] - Get a single bill
export async function GET(request: Request, { params }: RouteParams) {
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
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

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
        notes: body.notes,
        payment_url: body.payment_url,
        is_autopay: body.is_autopay,
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
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
