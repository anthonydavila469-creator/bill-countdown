-- Add notification_settings column to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_enabled": true,
  "push_enabled": false,
  "lead_days": 3,
  "quiet_start": null,
  "quiet_end": null,
  "timezone": "America/New_York"
}'::jsonb;

-- Create push_subscriptions table for Web Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Push subscriptions policies
DO $$ BEGIN
  CREATE POLICY "Users can read own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create bill_notifications_queue table
CREATE TABLE IF NOT EXISTS public.bill_notifications_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_date DATE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, bill_id, channel, scheduled_date)
);

-- Enable RLS on bill_notifications_queue
ALTER TABLE public.bill_notifications_queue ENABLE ROW LEVEL SECURITY;

-- Notifications queue policy
DO $$ BEGIN
  CREATE POLICY "Users can read own notifications"
    ON public.bill_notifications_queue FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_pending
  ON public.bill_notifications_queue (scheduled_for, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_by_bill
  ON public.bill_notifications_queue (bill_id, status);
