-- Temporary auth transfer table for Capacitor OAuth bridge.
-- When OAuth completes in SFSafariViewController, session tokens are stored here
-- so the WKWebView can retrieve them (they don't share cookies).

CREATE TABLE auth_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_key text UNIQUE NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Auto-cleanup: delete transfers older than 5 minutes on each insert
CREATE OR REPLACE FUNCTION cleanup_expired_auth_transfers() RETURNS trigger AS $$
BEGIN
  DELETE FROM auth_transfers WHERE created_at < now() - interval '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_auth_transfers
  AFTER INSERT ON auth_transfers
  EXECUTE FUNCTION cleanup_expired_auth_transfers();

-- No public access — only server-side (service role) can read/write
ALTER TABLE auth_transfers ENABLE ROW LEVEL SECURITY;
