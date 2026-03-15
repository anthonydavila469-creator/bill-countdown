-- Add multi-provider email support while preserving the existing gmail_tokens table.

ALTER TABLE public.gmail_tokens
ADD COLUMN IF NOT EXISTS email_provider TEXT NOT NULL DEFAULT 'gmail';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gmail_tokens_email_provider_check'
  ) THEN
    ALTER TABLE public.gmail_tokens
    ADD CONSTRAINT gmail_tokens_email_provider_check
    CHECK (email_provider IN ('gmail', 'yahoo', 'outlook'));
  END IF;
END $$;

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS email_provider TEXT NOT NULL DEFAULT 'gmail';

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS email_connected BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT;

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT;

ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS gmail_token_expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_preferences'
      AND column_name = 'gmail_connected'
  ) THEN
    EXECUTE '
      ALTER TABLE public.user_preferences
      ADD COLUMN gmail_connected BOOLEAN GENERATED ALWAYS AS (email_connected) STORED
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_preferences_email_provider_check'
  ) THEN
    ALTER TABLE public.user_preferences
    ADD CONSTRAINT user_preferences_email_provider_check
    CHECK (email_provider IN (''gmail'', ''yahoo'', ''outlook''));
  END IF;
END $$;

UPDATE public.gmail_tokens
SET email_provider = COALESCE(NULLIF(email_provider, ''), 'gmail')
WHERE email_provider IS DISTINCT FROM COALESCE(NULLIF(email_provider, ''), 'gmail');

UPDATE public.user_preferences up
SET
  email_provider = gt.email_provider,
  email_connected = true,
  gmail_access_token = gt.access_token,
  gmail_refresh_token = gt.refresh_token,
  gmail_token_expires_at = gt.expires_at
FROM public.gmail_tokens gt
WHERE gt.user_id = up.user_id;

COMMENT ON COLUMN public.gmail_tokens.email_provider IS 'Connected email provider: gmail, yahoo, or outlook';
COMMENT ON COLUMN public.user_preferences.email_provider IS 'Preferred or connected email provider';
COMMENT ON COLUMN public.user_preferences.email_connected IS 'Whether any supported email provider is currently connected';
COMMENT ON COLUMN public.user_preferences.gmail_connected IS 'Backward-compatible alias for email_connected';
COMMENT ON COLUMN public.user_preferences.gmail_access_token IS 'Backward-compatible email access token storage used for any provider';
COMMENT ON COLUMN public.user_preferences.gmail_refresh_token IS 'Backward-compatible email refresh token storage used for any provider';
COMMENT ON COLUMN public.user_preferences.gmail_token_expires_at IS 'Backward-compatible email token expiry used for any provider';
