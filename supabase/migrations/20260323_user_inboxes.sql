CREATE TABLE IF NOT EXISTS user_inboxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inbox_address TEXT NOT NULL UNIQUE,
  agentmail_inbox_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  bills_received INTEGER DEFAULT 0,
  last_bill_at TIMESTAMPTZ
);

CREATE INDEX idx_user_inboxes_address ON user_inboxes(inbox_address);

ALTER TABLE user_inboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_inboxes"
  ON user_inboxes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_inboxes"
  ON user_inboxes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
