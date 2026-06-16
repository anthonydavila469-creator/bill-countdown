-- Compatibility Smart Scans quota ledger for the production Vercel
-- Supabase project. That schema does not currently have
-- public.scan_attempts, so pay_later_scan_attempt_id is intentionally a
-- plain UUID here instead of an FK. Everything else matches the backend
-- quota contract:
--
--   Free users: 2 lifetime Smart Scan units
--   Pro users:  10 Smart Scan units per monthly period
--   Bill scan:  1 unit
--   Pay Later:  2 units

CREATE TABLE IF NOT EXISTS public.smart_scan_usage_events (
  id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  period_start               DATE         DEFAULT NULL,

  scan_kind                  TEXT         NOT NULL CHECK (scan_kind IN ('bill', 'pay_later')),
  units                      INTEGER      NOT NULL CHECK (units IN (1, 2)),
  route                      TEXT         NOT NULL,
  status                     TEXT         NOT NULL CHECK (status IN ('reserved', 'charged', 'released')),
  charge_reason              TEXT         DEFAULT NULL,

  model_provider             TEXT         DEFAULT NULL,
  model_name                 TEXT         DEFAULT NULL,
  model_call_started_at      TIMESTAMPTZ  DEFAULT NULL,
  model_call_finished_at     TIMESTAMPTZ  DEFAULT NULL,

  bill_scan_session_id       UUID         DEFAULT NULL REFERENCES public.bill_scan_sessions(id) ON DELETE SET NULL,
  pay_later_scan_attempt_id  UUID         DEFAULT NULL,

  idempotency_key            TEXT         DEFAULT NULL,
  error_code                 TEXT         DEFAULT NULL,

  image_count                INTEGER      DEFAULT NULL CHECK (image_count IS NULL OR image_count >= 0),
  file_size_bytes            INTEGER      DEFAULT NULL CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  latency_ms                 INTEGER      DEFAULT NULL CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS smart_scan_usage_events_user_created_idx
  ON public.smart_scan_usage_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS smart_scan_usage_events_user_period_status_idx
  ON public.smart_scan_usage_events(user_id, period_start, status);

CREATE UNIQUE INDEX IF NOT EXISTS smart_scan_usage_events_user_idempotency_key_idx
  ON public.smart_scan_usage_events(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.smart_scan_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "smart_scan_usage_events_owner_select"
  ON public.smart_scan_usage_events;
CREATE POLICY "smart_scan_usage_events_owner_select"
  ON public.smart_scan_usage_events
  FOR SELECT
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.smart_scan_usage_events FROM anon, authenticated;
GRANT SELECT ON public.smart_scan_usage_events TO authenticated;
GRANT ALL ON public.smart_scan_usage_events TO service_role;

COMMENT ON TABLE public.smart_scan_usage_events IS
  'Backend-owned Smart Scans quota ledger. Only charged rows count toward the user allowance; reserved/released rows are audit/idempotency records. Client writes are intentionally blocked.';

COMMENT ON COLUMN public.smart_scan_usage_events.period_start IS
  'NULL for Free lifetime usage; first day of the UTC month for Pro monthly quota windows.';

COMMENT ON COLUMN public.smart_scan_usage_events.scan_kind IS
  'Smart Scan type: bill costs 1 unit; pay_later costs 2 units.';

COMMENT ON COLUMN public.smart_scan_usage_events.units IS
  'Smart Scan units charged or reserved for this event. Bill scan = 1; Pay Later = 2.';

COMMENT ON COLUMN public.smart_scan_usage_events.status IS
  'Quota event status. Only charged rows count as used units; reserved and released rows do not count.';

COMMENT ON COLUMN public.smart_scan_usage_events.idempotency_key IS
  'Optional request idempotency key used to avoid double charging retried scan requests.';

COMMENT ON COLUMN public.smart_scan_usage_events.bill_scan_session_id IS
  'Optional link to regular bill scan audit row.';

COMMENT ON COLUMN public.smart_scan_usage_events.pay_later_scan_attempt_id IS
  'Optional Pay Later scan telemetry id. No FK on this production schema because public.scan_attempts is not present here.';
