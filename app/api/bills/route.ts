import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/bills - Get all bills for the current user
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query params for filtering
    const { searchParams } = new URL(request.url);
    const showPaid = searchParams.get('showPaid') === 'true';
    const category = searchParams.get('category');

    // Build query
    let query = supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    // Filter by paid status
    if (!showPaid) {
      query = query.eq('is_paid', false);
    }

    // Filter by category
    if (category) {
      query = query.eq('category', category);
    }

    const { data: bills, error } = await query;

    if (error) {
      console.error('Error fetching bills:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bills' },
        { status: 500 }
      );
    }

    return NextResponse.json(bills);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/bills - Create a new bill
export async function POST(request: Request) {
  try {
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

    // Validate required fields
    if (!body.name || !body.due_date) {
      return NextResponse.json(
        { error: 'Name and due date are required' },
        { status: 400 }
      );
    }

    // Create bill
    const { data: bill, error } = await supabase
      .from('bills')
      .insert({
        user_id: user.id,
        name: body.name,
        amount: body.amount || null,
        due_date: body.due_date,
        emoji: body.emoji || '📄',
        category: body.category || null,
        is_recurring: body.is_recurring || false,
        recurrence_interval: body.recurrence_interval || null,
        notes: body.notes || null,
        payment_url: body.payment_url || null,
        is_autopay: body.is_autopay || false,
        source: 'manual',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bill:', error);
      return NextResponse.json(
        { error: 'Failed to create bill' },
        { status: 500 }
      );
    }

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
