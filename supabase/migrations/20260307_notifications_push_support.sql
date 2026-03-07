-- Migration: Add is_active to apns_tokens + processing status to notification queue
-- Required for send-bill-reminders Edge Function

-- 1. Add is_active to apns_tokens so we can deactivate stale/invalid tokens
ALTER TABLE apns_tokens
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS apns_tokens_user_active_idx
  ON apns_tokens(user_id, is_active)
  WHERE is_active = true;

-- 2. Expand status check constraint to include 'processing'
--    This prevents double-sends when the Edge Function runs concurrently
ALTER TABLE public.bill_notifications_queue
  DROP CONSTRAINT IF EXISTS bill_notifications_queue_status_check;

ALTER TABLE public.bill_notifications_queue
  ADD CONSTRAINT bill_notifications_queue_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped'));

-- 3. Add index on processing status so stale processing rows can be cleaned up
CREATE INDEX IF NOT EXISTS bill_notifications_queue_processing_idx
  ON public.bill_notifications_queue (status, scheduled_for)
  WHERE status = 'processing';
