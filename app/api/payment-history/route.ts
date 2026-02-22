import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/payment-history?bill_id=xxx — fetch payment history for a bill
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billId = request.nextUrl.searchParams.get('bill_id');
    if (!billId) {
      return NextResponse.json({ error: 'bill_id is required' }, { status: 400 });
    }

    // Also fetch history for related recurring bills (parent + children)
    // so the timeline shows the full payment history across recurrences
    const { data: bill } = await supabase
      .from('bills')
      .select('id, parent_bill_id')
      .eq('id', billId)
      .single();

    const billIds = [billId];
    if (bill?.parent_bill_id) {
      billIds.push(bill.parent_bill_id);
      // Also get sibling bills (other children of same parent)
      const { data: siblings } = await supabase
        .from('bills')
        .select('id')
        .eq('parent_bill_id', bill.parent_bill_id)
        .neq('id', billId);
      if (siblings) {
        billIds.push(...siblings.map(s => s.id));
      }
    }
    // Get children of this bill too
    const { data: children } = await supabase
      .from('bills')
      .select('id')
      .eq('parent_bill_id', billId);
    if (children) {
      billIds.push(...children.map(c => c.id));
    }

    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', user.id)
      .in('bill_id', billIds)
      .order('paid_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
      return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/payment-history — create a payment history entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bill_id, amount, paid_method, notes, paid_at } = body;

    if (!bill_id) {
      return NextResponse.json({ error: 'bill_id is required' }, { status: 400 });
    }

    // Verify the bill belongs to the user
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, user_id')
      .eq('id', bill_id)
      .single();

    if (billError || !bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (bill.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('payment_history')
      .insert({
        user_id: user.id,
        bill_id,
        amount: amount ?? null,
        paid_method: paid_method ?? null,
        notes: notes ?? null,
        paid_at: paid_at ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment history entry:', error);
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
