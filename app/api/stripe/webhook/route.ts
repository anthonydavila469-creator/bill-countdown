import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, syncSubscriptionToDatabase } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';

// Disable body parsing - we need raw body for signature verification
export const dynamic = 'force-dynamic';

// POST /api/stripe/webhook - Handle Stripe webhooks
export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error('Missing supabase_user_id in session metadata');
          break;
        }

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Sync to database
        await syncSubscriptionToDatabase(userId, subscription, customerId);

        console.log(`Checkout completed for user ${userId}`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Try to find user by customer ID
          const customerId = subscription.customer as string;
          const { data: preferences } = await supabase
            .from('user_preferences')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single();

          if (preferences?.user_id) {
            await syncSubscriptionToDatabase(preferences.user_id, subscription);
            console.log(`Subscription ${event.type} for user ${preferences.user_id}`);
          } else {
            console.error('Could not find user for subscription update');
          }
        } else {
          await syncSubscriptionToDatabase(userId, subscription);
          console.log(`Subscription ${event.type} for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (preferences?.user_id) {
          // Sync null subscription (will reset to free)
          await syncSubscriptionToDatabase(preferences.user_id, null);
          console.log(`Subscription deleted for user ${preferences.user_id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find user by customer ID
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (preferences?.user_id) {
          // Update status to past_due
          await supabase
            .from('user_preferences')
            .update({ subscription_status: 'past_due' })
            .eq('user_id', preferences.user_id);

          console.log(`Payment failed for user ${preferences.user_id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // subscription can be a string ID or null
        const invoiceWithSub = invoice as unknown as { subscription: string | null };
        const subscriptionId = invoiceWithSub.subscription;

        if (!subscriptionId) break;

        // Find user by customer ID
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (preferences?.user_id) {
          // Get fresh subscription data
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscriptionToDatabase(preferences.user_id, subscription);
          console.log(`Payment succeeded for user ${preferences.user_id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
