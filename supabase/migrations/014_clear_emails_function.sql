-- Function to clear emails_raw that don't have accepted bill extractions
-- Used by the Force Rescan feature to reset processed email state

CREATE OR REPLACE FUNCTION clear_unaccepted_emails_raw(p_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM emails_raw
  WHERE user_id = p_user_id
  AND id NOT IN (
    SELECT email_raw_id FROM bill_extractions
    WHERE user_id = p_user_id
    AND status IN ('accepted', 'auto_accepted', 'confirmed')
    AND email_raw_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
