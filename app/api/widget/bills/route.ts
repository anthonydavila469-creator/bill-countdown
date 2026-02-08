import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWidgetToken } from '@/lib/widget-auth';

/**
 * GET /api/widget/bills
 * Returns bills for authenticated widget user
 */
export async function GET(request: Request) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const userId = await verifyWidgetToken(token);
    
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch user's bills
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('is_paid', false)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('[Widget API] Error fetching bills:', error);
      return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
    }

    return NextResponse.json({ bills: bills || [] });
  } catch (error) {
    console.error('[Widget API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
