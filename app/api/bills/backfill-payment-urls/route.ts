import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getFallbackPaymentUrl } from '@/lib/vendor-payment-urls';

/**
 * POST /api/bills/backfill-payment-urls
 *
 * Backfill payment_url for existing bills that don't have one.
 * Uses vendor name matching to apply fallback URLs.
 */
export async function POST() {
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

    // Get all bills without payment_url
    const { data: bills, error: fetchError } = await supabase
      .from('bills')
      .select('id, name')
      .eq('user_id', user.id)
      .is('payment_url', null);

    if (fetchError) {
      console.error('Error fetching bills:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch bills' },
        { status: 500 }
      );
    }

    if (!bills || bills.length === 0) {
      return NextResponse.json({
        updated: 0,
        message: 'No bills need payment URL backfill',
      });
    }

    // Find fallback URLs for each bill
    const updates: { id: string; payment_url: string }[] = [];

    for (const bill of bills) {
      const fallbackUrl = getFallbackPaymentUrl(bill.name);
      if (fallbackUrl) {
        updates.push({ id: bill.id, payment_url: fallbackUrl });
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({
        updated: 0,
        checked: bills.length,
        message: 'No matching vendors found for bills without payment URLs',
      });
    }

    // Update bills with fallback URLs
    let successCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('bills')
        .update({ payment_url: update.payment_url })
        .eq('id', update.id)
        .eq('user_id', user.id);

      if (updateError) {
        errors.push(`Failed to update bill ${update.id}: ${updateError.message}`);
      } else {
        successCount++;
      }
    }

    return NextResponse.json({
      updated: successCount,
      checked: bills.length,
      matched: updates.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Updated ${successCount} bills with fallback payment URLs`,
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: 'Failed to backfill payment URLs' },
      { status: 500 }
    );
  }
}
