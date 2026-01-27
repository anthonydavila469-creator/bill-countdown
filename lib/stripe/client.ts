import Stripe from 'stripe';
import { createAdminClient } from '../supabase/admin';

// Lazy-initialized Stripe client to allow build without env vars
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  stripeInstance = new Stripe(secretKey);
  return stripeInstance;
}

// Export getter function instead of direct instance
export const stripe = {
  get instance() {
    return getStripe();
  },
  // Proxy common methods for convenience
  get customers() {
    return getStripe().customers;
  },
  get checkout() {
    return getStripe().checkout;
  },
  get billingPortal() {
    return getStripe().billingPortal;
  },
  get subscriptions() {
    return getStripe().subscriptions;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
};

// Price IDs from Stripe dashboard
export const PRICE_IDS = {
  MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID || '',
  YEARLY: process.env.STRIPE_YEARLY_PRICE_ID || '',
} as const;

export const PRICES = {
  MONTHLY: 4.99,
  YEARLY: 39.99,
} as const;

export type SubscriptionStatus = 'free' | 'active' | 'canceled' | 'past_due';
export type SubscriptionPlan = 'monthly' | 'yearly' | null;

// Get or create a Stripe customer for a user
export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  const supabase = createAdminClient();

  // Check if user already has a Stripe customer ID
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  if (preferences?.stripe_customer_id) {
    return preferences.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  });

  // Save customer ID to user preferences
  await supabase
    .from('user_preferences')
    .update({ stripe_customer_id: customer.id })
    .eq('user_id', userId);

  return customer.id;
}

// Create a Stripe Checkout session for subscription
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  returnUrl: string
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=true`,
    subscription_data: {
      metadata: {
        supabase_user_id: userId,
      },
    },
    metadata: {
      supabase_user_id: userId,
    },
    allow_promotion_codes: true,
  });

  return session;
}

// Create a Stripe Customer Portal session
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

// Get subscription status for a customer
export async function getSubscriptionStatus(
  customerId: string
): Promise<{
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}> {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 1,
  });

  const subscription = subscriptions.data[0];

  if (!subscription) {
    return {
      status: 'free',
      plan: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  // Determine plan type from price ID
  const priceId = subscription.items.data[0]?.price.id;
  let plan: SubscriptionPlan = null;
  if (priceId === PRICE_IDS.MONTHLY) {
    plan = 'monthly';
  } else if (priceId === PRICE_IDS.YEARLY) {
    plan = 'yearly';
  }

  // Map Stripe status to our status
  let status: SubscriptionStatus = 'free';
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      status = 'active';
      break;
    case 'past_due':
      status = 'past_due';
      break;
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      status = 'canceled';
      break;
    default:
      status = 'free';
  }

  // Access current_period_end - it's a Unix timestamp in seconds
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

  return {
    status,
    plan,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
  };
}

// Sync subscription status from Stripe to database
export async function syncSubscriptionToDatabase(
  userId: string,
  subscription: Stripe.Subscription | null,
  customerId?: string
): Promise<void> {
  const supabase = createAdminClient();

  if (!subscription) {
    // No subscription - revert to free
    await supabase
      .from('user_preferences')
      .update({
        subscription_status: 'free',
        subscription_plan: null,
        subscription_current_period_end: null,
        subscription_cancel_at_period_end: false,
        stripe_subscription_id: null,
        is_pro: false,
      })
      .eq('user_id', userId);
    return;
  }

  // Determine plan type
  const priceId = subscription.items.data[0]?.price.id;
  let plan: SubscriptionPlan = null;
  if (priceId === PRICE_IDS.MONTHLY) {
    plan = 'monthly';
  } else if (priceId === PRICE_IDS.YEARLY) {
    plan = 'yearly';
  }

  // Map status
  let status: SubscriptionStatus = 'free';
  let isPro = false;
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      status = 'active';
      isPro = true;
      break;
    case 'past_due':
      status = 'past_due';
      isPro = true; // Still allow access during grace period
      break;
    case 'canceled':
      status = 'canceled';
      // Check if still in paid period
      const canceledPeriodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;
      isPro = canceledPeriodEnd ? canceledPeriodEnd * 1000 > Date.now() : false;
      break;
    default:
      status = 'free';
      isPro = false;
  }

  // Access current_period_end - it's a Unix timestamp in seconds
  const periodEndSeconds = (subscription as unknown as { current_period_end: number }).current_period_end;

  const updateData: Record<string, unknown> = {
    subscription_status: status,
    subscription_plan: plan,
    subscription_current_period_end: periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    stripe_subscription_id: subscription.id,
    is_pro: isPro,
  };

  if (customerId) {
    updateData.stripe_customer_id = customerId;
  }

  await supabase
    .from('user_preferences')
    .update(updateData)
    .eq('user_id', userId);
}
