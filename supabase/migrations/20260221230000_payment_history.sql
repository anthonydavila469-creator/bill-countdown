-- Payment history log: tracks every payment made for each bill
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  amount numeric,
  paid_method text CHECK (paid_method IN ('manual', 'autopay')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups: most recent payments first per bill
CREATE INDEX idx_payment_history_bill_paid_at
  ON payment_history (bill_id, paid_at DESC);

-- RLS: users can only see their own payment history
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment history"
  ON payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment history"
  ON payment_history FOR DELETE
  USING (auth.uid() = user_id);
