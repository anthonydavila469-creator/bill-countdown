import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

// DELETE /api/bills/clear-all - Delete all bills and related data for the current user
export async function DELETE() {
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

    const userId = user.id;

    // Use admin client to bypass RLS and delete all user's bill data
    const adminClient = createAdminClient();

    // Delete in order (respecting foreign key constraints)
    // 1. Delete notification queue entries
    const { error: notifError } = await adminClient
      .from('bill_notifications_queue')
      .delete()
      .eq('user_id', userId);

    if (notifError) {
      console.error('Error deleting notifications:', notifError);
    }

    // 2. Delete bill extractions
    const { error: extractError } = await adminClient
      .from('bill_extractions')
      .delete()
      .eq('user_id', userId);

    if (extractError) {
      console.error('Error deleting bill extractions:', extractError);
    }

    // 3. Delete all bills
    const { data: deletedBills, error: billsError } = await adminClient
      .from('bills')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (billsError) {
      console.error('Error deleting bills:', billsError);
      return NextResponse.json(
        { error: 'Failed to delete bills' },
        { status: 500 }
      );
    }

    const deletedCount = deletedBills?.length || 0;

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} bill(s) and related data`,
      deletedCount
    });
  } catch (error) {
    console.error('Unexpected error clearing bills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
