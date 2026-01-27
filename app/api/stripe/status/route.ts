import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/stripe/status - Get subscription status for current user
export async function GET() {
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

    // Get user preferences with subscription info
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select(`
        is_pro,
        subscription_status,
        subscription_plan,
        subscription_current_period_end,
        subscription_cancel_at_period_end,
        gmail_syncs_used
      `)
      .eq('user_id', user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Error fetching subscription status:', prefsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscription status' },
        { status: 500 }
      );
    }

    // Return defaults if no preferences exist
    if (!preferences) {
      return NextResponse.json({
        isPro: false,
        subscriptionStatus: 'free',
        subscriptionPlan: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        gmailSyncsUsed: 0,
      });
    }

    // Count user's bills for limit tracking
    const { count: billCount } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      isPro: preferences.is_pro ?? false,
      subscriptionStatus: preferences.subscription_status ?? 'free',
      subscriptionPlan: preferences.subscription_plan ?? null,
      currentPeriodEnd: preferences.subscription_current_period_end ?? null,
      cancelAtPeriodEnd: preferences.subscription_cancel_at_period_end ?? false,
      gmailSyncsUsed: preferences.gmail_syncs_used ?? 0,
      billsUsed: billCount ?? 0,
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
