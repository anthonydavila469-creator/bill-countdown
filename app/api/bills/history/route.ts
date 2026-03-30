import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';

// GET /api/bills/history - Get payment history for the current user
export async function GET(request: Request) {
  try {
    const { user, method } = await getAuthenticatedUser(request);
    const supabase = method === 'bearer' ? createAdminClient() : await createClient();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: bills, error } = await supabase
      .from('bills')
      .select('id, name, amount, paid_at, emoji, category, last_paid_amount')
      .eq('user_id', user.id)
      .eq('is_paid', true)
      .not('paid_at', 'is', null)
      .order('paid_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }

    const payments = (bills || []).map((bill) => ({
      id: bill.id,
      bill_id: bill.id,
      bill_name: bill.name,
      amount: bill.last_paid_amount ?? bill.amount ?? 0,
      paid_date: bill.paid_at,
      emoji: bill.emoji || '📄',
      category: bill.category || 'other',
    }));

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
