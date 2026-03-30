-- Switch to shared inbox model: all users share duezo-bills@agentmail.to
-- Drop the UNIQUE constraint on inbox_address since all rows will have the same value
ALTER TABLE user_inboxes DROP CONSTRAINT IF EXISTS user_inboxes_inbox_address_key;

-- Add unique constraint on user_id instead (one record per user)
ALTER TABLE user_inboxes ADD CONSTRAINT user_inboxes_user_id_key UNIQUE (user_id);
