-- Add read_at column for in-app notification feed
ALTER TABLE bill_notifications_queue ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- Add message column for human-readable notification text
ALTER TABLE bill_notifications_queue ADD COLUMN IF NOT EXISTS message TEXT DEFAULT NULL;

-- Allow 'in_app' as a channel type
ALTER TABLE bill_notifications_queue DROP CONSTRAINT IF EXISTS bill_notifications_queue_channel_check;
ALTER TABLE bill_notifications_queue ADD CONSTRAINT bill_notifications_queue_channel_check
  CHECK (channel IN ('email', 'push', 'in_app'));

-- Index for feed queries
CREATE INDEX IF NOT EXISTS idx_notifications_feed
  ON bill_notifications_queue (user_id, scheduled_for DESC)
  WHERE channel = 'in_app';

-- Update RLS: allow users to update their own notifications (for marking read)
DO $$ BEGIN
  CREATE POLICY "Users can update own notifications"
    ON public.bill_notifications_queue FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
