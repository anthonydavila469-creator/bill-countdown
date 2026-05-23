-- Phase 13: Pay Later scan telemetry.
-- Migration: 20260524_pay_later_scan_telemetry.sql
--
-- Two tables to support the self-improvement loop:
--
--   scan_attempts     — one row per scan, captures the validated output
--                       + provider + confidence + warnings. NEVER stores
--                       raw image bytes (privacy: financial screenshots).
--   scan_corrections  — one row per user edit to a saved plan, captures
--                       the model's value vs. the user's corrected value
--                       so we can build provider-specific patterns and
--                       evaluation cases from real corrections.
--
-- Apply to the mobile project (bnxxfolkrpevqzxmgkyx). The web project
-- doesn't have a Pay Later UI today, so it doesn't need this.
--
-- The three additional tables from the Phase 13 spec
-- (`provider_patterns`, `scanner_eval_cases`, `scanner_versions`) are
-- intentionally NOT added here — they belong to the follow-up
-- self-improvement phase, where their promotion/shadow logic also
-- lives. Adding them empty today would only invite drift.

-- ---------------------------------------------------------------------
-- scan_attempts
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scan_attempts (
  id                     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Scanner provenance (lets us correlate corrections with the version
  -- that produced the original extraction).
  scanner_version        TEXT            NOT NULL,
  validator_version      TEXT            NOT NULL,
  model                  TEXT            NOT NULL,

  -- Lightweight classification fields for analytics filtering.
  source_type            TEXT            DEFAULT NULL,
  provider_normalized    TEXT            DEFAULT NULL,

  -- Outcome of THIS scan attempt.
  confidence             NUMERIC(4,3)    DEFAULT NULL,
  scan_status            TEXT            NOT NULL,           -- saved / draft_needs_review / unreadable
  needs_review           BOOLEAN         NOT NULL DEFAULT FALSE,
  warnings               TEXT[]          NOT NULL DEFAULT '{}',
  missing_fields         TEXT[]          NOT NULL DEFAULT '{}',

  -- Input metadata (counts only — never the bytes).
  image_count            INTEGER         NOT NULL DEFAULT 0,
  latency_ms             INTEGER         DEFAULT NULL,
  vision_error           TEXT            DEFAULT NULL,

  -- Validated structured output as JSONB. Safe to store: no PII beyond
  -- merchant + last4 + due dates. Powers diff-against-corrections and
  -- the eventual eval-set generation.
  validated_output       JSONB           NOT NULL,

  -- Final user disposition (filled in by /api/pay-later/plans on save
  -- or cancel — wiring lives in the iOS save path follow-up turn).
  user_saved             BOOLEAN         DEFAULT NULL,
  user_cancelled         BOOLEAN         DEFAULT NULL,
  user_uploaded_more     BOOLEAN         DEFAULT NULL
);

-- ---------------------------------------------------------------------
-- scan_corrections
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scan_corrections (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_attempt_id     UUID         NOT NULL REFERENCES public.scan_attempts(id) ON DELETE CASCADE,
  user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  field_name          TEXT         NOT NULL,            -- e.g. "merchantName", "installments[2].amountCents"
  -- Values stored as JSONB so we can capture cents (number), date
  -- strings, status enums, or even installment payloads with one
  -- column shape.
  model_value         JSONB        DEFAULT NULL,
  corrected_value     JSONB        DEFAULT NULL,
  correction_type     TEXT         NOT NULL             -- merchant / provider / amount / date / status / installment_added / installment_removed / other
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS scan_attempts_user_idx
  ON public.scan_attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS scan_attempts_provider_idx
  ON public.scan_attempts(provider_normalized, created_at DESC);

CREATE INDEX IF NOT EXISTS scan_attempts_status_idx
  ON public.scan_attempts(scan_status, created_at DESC);

CREATE INDEX IF NOT EXISTS scan_corrections_attempt_idx
  ON public.scan_corrections(scan_attempt_id);

CREATE INDEX IF NOT EXISTS scan_corrections_field_idx
  ON public.scan_corrections(field_name, correction_type);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

ALTER TABLE public.scan_attempts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scan_attempts_owner_select" ON public.scan_attempts;
CREATE POLICY "scan_attempts_owner_select" ON public.scan_attempts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scan_attempts_owner_insert" ON public.scan_attempts;
CREATE POLICY "scan_attempts_owner_insert" ON public.scan_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scan_attempts_owner_update" ON public.scan_attempts;
CREATE POLICY "scan_attempts_owner_update" ON public.scan_attempts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scan_corrections_owner_select" ON public.scan_corrections;
CREATE POLICY "scan_corrections_owner_select" ON public.scan_corrections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scan_corrections_owner_insert" ON public.scan_corrections;
CREATE POLICY "scan_corrections_owner_insert" ON public.scan_corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------

COMMENT ON TABLE public.scan_attempts IS
  'One row per Pay Later scan invocation. Stores validated structured output + provenance + warnings — never raw image bytes (privacy: financial screenshots).';

COMMENT ON TABLE public.scan_corrections IS
  'User edits to a scanned plan, captured as field-level diffs against the model output. Drives the self-improvement loop (provider patterns + eval cases) in a follow-up phase.';

COMMENT ON COLUMN public.scan_attempts.validated_output IS
  'JSONB snapshot of the ValidatedPayLaterScanResult shape. Safe to store — no raw image bytes.';
