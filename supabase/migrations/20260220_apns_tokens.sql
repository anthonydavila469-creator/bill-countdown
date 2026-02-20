-- APNs device tokens for iOS push notifications
CREATE TABLE IF NOT EXISTS apns_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS apns_tokens_user_id_idx ON apns_tokens(user_id);

ALTER TABLE apns_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own APNs tokens"
  ON apns_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
