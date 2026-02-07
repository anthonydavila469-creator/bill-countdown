-- Add subscription fields to user_preferences table for Stripe integration

-- Stripe customer and subscription IDs
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Subscription status and plan
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL;

-- Subscription period tracking
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN DEFAULT false;

-- Gmail sync usage tracking for free tier limits
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS gmail_syncs_used INTEGER DEFAULT 0;

-- Add index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_stripe_customer
  ON public.user_preferences(stripe_customer_id);

-- Add check constraint for subscription_status
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_subscription_status
  CHECK (subscription_status IN ('free', 'active', 'canceled', 'past_due'));

-- Add check constraint for subscription_plan
ALTER TABLE public.user_preferences
ADD CONSTRAINT chk_subscription_plan
  CHECK (subscription_plan IS NULL OR subscription_plan IN ('monthly', 'yearly'));

-- Comment explaining the new columns
COMMENT ON COLUMN public.user_preferences.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.user_preferences.stripe_subscription_id IS 'Current Stripe subscription ID';
COMMENT ON COLUMN public.user_preferences.subscription_status IS 'free, active, canceled, or past_due';
COMMENT ON COLUMN public.user_preferences.subscription_plan IS 'monthly or yearly subscription plan';
COMMENT ON COLUMN public.user_preferences.subscription_current_period_end IS 'When the current billing period ends';
COMMENT ON COLUMN public.user_preferences.subscription_cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN public.user_preferences.gmail_syncs_used IS 'Number of Gmail syncs used (free tier limit: 1)';
