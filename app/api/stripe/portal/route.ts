import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe/client';

// POST /api/stripe/portal - Create Stripe Customer Portal session
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

    // Get user's Stripe customer ID
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (prefsError || !preferences?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      );
    }

    // Determine return URL from request origin
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const returnUrl = `${origin}/dashboard/settings`;

    // Create portal session
    const session = await createPortalSession(
      preferences.stripe_customer_id,
      returnUrl
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
