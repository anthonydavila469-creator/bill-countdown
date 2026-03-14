import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhook — no user auth context
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// RevenueCat webhook event types
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'SUBSCRIBER_ALIAS'
  | 'SUBSCRIPTION_PAUSED'
  | 'SUBSCRIPTION_EXTENDED'
  | 'TRANSFER'
  | 'NON_RENEWING_PURCHASE'
  | 'TEST';

interface RevenueCatEvent {
  type: RevenueCatEventType;
  app_user_id: string;
  product_id: string;
  expiration_at_ms: number | null;
  period_type: 'TRIAL' | 'INTRO' | 'NORMAL';
  purchased_at_ms: number;
  store: string;
  environment: string;
}

interface RevenueCatWebhookBody {
  api_version: string;
  event: RevenueCatEvent;
}

export async function POST(request: NextRequest) {
  // Verify webhook authorization
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.REVENUCAT_WEBHOOK_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    console.error('[RevenueCat Webhook] Invalid authorization header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as RevenueCatWebhookBody;
    const { event } = body;

    if (!event?.type || !event?.app_user_id) {
      console.error('[RevenueCat Webhook] Missing event type or app_user_id');
      // Return 200 to prevent retries for malformed events
      return NextResponse.json({ received: true });
    }

    const userId = event.app_user_id;
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;

    console.log(`[RevenueCat Webhook] ${event.type} for user ${userId}, product: ${event.product_id}`);

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'SUBSCRIPTION_EXTENDED': {
        const status = event.period_type === 'TRIAL' ? 'trialing' : 'active';
        await updateSubscription(userId, {
          subscription_status: status,
          subscription_tier: 'pro',
          subscription_expires_at: expiresAt,
          revenucat_customer_id: userId,
        });
        break;
      }

      case 'CANCELLATION': {
        // User cancelled but may still have access until period ends
        await updateSubscription(userId, {
          subscription_status: 'active', // Still active until expiration
          subscription_tier: 'pro',
          subscription_expires_at: expiresAt,
        });
        break;
      }

      case 'EXPIRATION': {
        await updateSubscription(userId, {
          subscription_status: 'expired',
          subscription_tier: 'free',
          subscription_expires_at: expiresAt,
        });
        break;
      }

      case 'BILLING_ISSUE': {
        await updateSubscription(userId, {
          subscription_status: 'billing_issue',
          subscription_tier: 'pro', // Keep pro access during grace period
          subscription_expires_at: expiresAt,
        });
        break;
      }

      default:
        // Handle other events silently
        console.log(`[RevenueCat Webhook] Unhandled event type: ${event.type}`);
        break;
    }

    // Always return 200 — RevenueCat retries on non-200
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[RevenueCat Webhook] Error processing webhook:', err);
    // Return 200 to prevent infinite retries on parse errors
    return NextResponse.json({ received: true });
  }
}

interface SubscriptionUpdate {
  subscription_status: string;
  subscription_tier: string;
  subscription_expires_at: string | null;
  revenucat_customer_id?: string;
}

async function updateSubscription(userId: string, update: SubscriptionUpdate) {
  const { error } = await supabase
    .from('user_preferences')
    .update({
      ...update,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error(`[RevenueCat Webhook] Failed to update subscription for ${userId}:`, error);
    throw error;
  }
}
