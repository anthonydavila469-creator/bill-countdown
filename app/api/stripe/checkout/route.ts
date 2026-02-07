import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  getOrCreateCustomer,
  createCheckoutSession,
  PRICE_IDS,
} from '@/lib/stripe/client';

// POST /api/stripe/checkout - Create Stripe Checkout session
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
    const { plan } = body as { plan: 'monthly' | 'yearly' };

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    // Get price ID for selected plan
    const priceId = plan === 'monthly' ? PRICE_IDS.MONTHLY : PRICE_IDS.YEARLY;

    if (!priceId) {
      console.error('Missing price ID for plan:', plan);
      return NextResponse.json(
        { error: 'Stripe configuration error' },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(user.id, user.email || '');

    // Determine return URL from request origin
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const returnUrl = `${origin}/dashboard/settings`;

    // Create checkout session
    const session = await createCheckoutSession(
      customerId,
      priceId,
      user.id,
      returnUrl
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
