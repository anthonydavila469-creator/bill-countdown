-- Add auto-sync settings and sync logging for daily Gmail sync

-- Create sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('manual', 'auto')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  emails_fetched INTEGER DEFAULT 0,
  emails_filtered INTEGER DEFAULT 0,
  emails_processed INTEGER DEFAULT 0,
  bills_created INTEGER DEFAULT 0,
  bills_needs_review INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies for sync_logs
DO $$ BEGIN
  CREATE POLICY "Users can read own sync logs"
    ON public.sync_logs FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_status
  ON public.sync_logs (user_id, status, started_at DESC);

-- Add new columns to gmail_tokens for auto-sync tracking
ALTER TABLE public.gmail_tokens
ADD COLUMN IF NOT EXISTS last_auto_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_sync_error TEXT;

-- Add auto_sync_enabled to notification_settings JSONB default
-- Note: We update the default, but existing rows will need to be handled in code
COMMENT ON COLUMN public.user_preferences.notification_settings IS
  'JSON settings including: email_enabled, push_enabled, lead_days, quiet_start, quiet_end, timezone, auto_sync_enabled';

-- PostgreSQL advisory lock helper functions for sync coordination

-- Acquire an advisory lock for a user's sync operation
-- Returns true if lock acquired, false if already held
CREATE OR REPLACE FUNCTION acquire_sync_lock(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  lock_id BIGINT;
  acquired BOOLEAN;
BEGIN
  -- Convert UUID to a bigint for advisory lock
  -- Using first 8 bytes of UUID as lock key
  lock_id := ('x' || substr(p_user_id::text, 1, 8))::bit(32)::bigint;

  -- Try to acquire the lock (non-blocking)
  SELECT pg_try_advisory_lock(lock_id) INTO acquired;

  RETURN acquired;
END;
$$;

-- Release an advisory lock for a user's sync operation
CREATE OR REPLACE FUNCTION release_sync_lock(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  lock_id BIGINT;
BEGIN
  lock_id := ('x' || substr(p_user_id::text, 1, 8))::bit(32)::bigint;
  PERFORM pg_advisory_unlock(lock_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION acquire_sync_lock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION release_sync_lock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION acquire_sync_lock(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION release_sync_lock(UUID) TO service_role;
