-- Expand subscription_status to support RevenueCat lifecycle states.
-- 017_add_subscription_fields.sql only allowed Stripe-centric values, which
-- causes writes like "trialing", "expired", and "billing_issue" to fail.

ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_subscription_status;

ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_subscription_status
  CHECK (
    subscription_status IN (
      'free',
      'active',
      'trialing',
      'canceled',
      'past_due',
      'billing_issue',
      'expired'
    )
  );

COMMENT ON COLUMN public.user_preferences.subscription_status IS
  'free, active, trialing, canceled, past_due, billing_issue, or expired';
