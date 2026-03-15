-- Add RevenueCat subscription fields to user_preferences
-- Supports both Stripe (web) and RevenueCat (iOS) billing

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS revenucat_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- Add check constraint for valid tier values
ALTER TABLE user_preferences
  ADD CONSTRAINT valid_subscription_tier
  CHECK (subscription_tier IN ('free', 'pro'));

-- Expand subscription_status to support RevenueCat lifecycle states.
-- Drop any existing constraints first
ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS chk_subscription_status;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_preferences' AND constraint_name = 'valid_subscription_status'
  ) THEN
    ALTER TABLE user_preferences DROP CONSTRAINT valid_subscription_status;
  END IF;
END $$;

ALTER TABLE user_preferences
  ADD CONSTRAINT valid_subscription_status
  CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due', 'trialing', 'expired', 'billing_issue'));

COMMENT ON COLUMN public.user_preferences.subscription_status IS
  'free, active, trialing, canceled, past_due, billing_issue, or expired';

-- Index on revenucat_customer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_revenucat_customer_id
  ON user_preferences (revenucat_customer_id)
  WHERE revenucat_customer_id IS NOT NULL;
