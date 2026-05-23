-- Phase 11: Pay Later persistence.
-- Migration: 20260523_create_installment_plans.sql
--
-- Two tables — `installment_plans` (one row per Pay Later plan) and
-- `installment_payments` (one row per installment, FK to the plan). The
-- iOS app reads/writes both directly via PostgREST against the mobile
-- Supabase project (bnxxfolkrpevqzxmgkyx). The web project does NOT
-- need this migration today — there is no web Pay Later UI; apply it
-- only when web persistence is added.
--
-- All money columns are DECIMAL(12,2) so we can hold up to
-- $9,999,999,999.99 without floating-point drift. `due_date` is DATE
-- (no time component) so it lines up with the local-midnight calendar
-- convention bills already use. RLS pins every row to `user_id =
-- auth.uid()` so a user can only ever see / mutate their own plans
-- and payments.
--
-- This migration is independent of the `bills` table — it does not
-- touch any existing schema, indexes, or RLS policies.

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.installment_plans (
  id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Provider: PayLaterProvider raw value (klarna / affirm / afterpay /
  -- shopPayInstallments / paypalPayIn4 / sezzle / zip / other).
  -- Stored as TEXT so a future provider added on iOS doesn't require a
  -- migration to land.
  provider                TEXT            NOT NULL DEFAULT 'other',
  provider_display_name   TEXT            DEFAULT NULL,
  merchant_name           TEXT            DEFAULT NULL,
  purchase_title          TEXT            DEFAULT NULL,
  order_identifier        TEXT            DEFAULT NULL,
  original_amount         DECIMAL(12,2)   NOT NULL DEFAULT 0,
  financed_amount         DECIMAL(12,2)   DEFAULT NULL,
  down_payment            DECIMAL(12,2)   DEFAULT NULL,
  -- `remaining_balance` is a snapshot from the scan or the manual
  -- form. The runtime "remaining" the UI shows is DERIVED from the
  -- payments table on the iOS side — this column is informational.
  remaining_balance       DECIMAL(12,2)   DEFAULT NULL,
  currency                TEXT            DEFAULT 'USD',
  plan_type               TEXT            DEFAULT NULL,
  installment_count       INTEGER         DEFAULT NULL,
  interval_days           INTEGER         DEFAULT NULL,
  apr                     DECIMAL(6,3)    DEFAULT NULL,
  interest_amount         DECIMAL(12,2)   DEFAULT NULL,
  fee_amount              DECIMAL(12,2)   DEFAULT NULL,
  payment_method_last4    TEXT            DEFAULT NULL,
  is_autopay              BOOLEAN         NOT NULL DEFAULT FALSE,
  -- PayLaterPlanStatus raw value: active / paid / overdue / canceled /
  -- unknown. Stored as TEXT to stay forward-compatible.
  status                  TEXT            NOT NULL DEFAULT 'active',
  source_document_type    TEXT            DEFAULT NULL,
  raw_source_text         TEXT            DEFAULT NULL,
  extraction_confidence   TEXT            DEFAULT NULL,
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.installment_payments (
  id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id                 UUID            NOT NULL REFERENCES public.installment_plans(id) ON DELETE CASCADE,
  sequence_number         INTEGER         NOT NULL,
  -- DATE (not TIMESTAMPTZ) so a payment due "May 25" lands on May 25
  -- in every timezone — same local-midnight convention as `bills.due_date`.
  due_date                DATE            NOT NULL,
  amount                  DECIMAL(12,2)   NOT NULL DEFAULT 0,
  -- PayLaterPaymentStatus raw value: scheduled / paid / overdue /
  -- missed / refunded / unknown.
  status                  TEXT            NOT NULL DEFAULT 'scheduled',
  paid_at                 TIMESTAMPTZ     DEFAULT NULL,
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  -- One row per (plan, sequence) — prevents duplicate payments for the
  -- same installment number if a scan retries or the UI double-saves.
  CONSTRAINT installment_payments_plan_seq_unique UNIQUE (plan_id, sequence_number)
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS installment_plans_user_idx
  ON public.installment_plans(user_id);

CREATE INDEX IF NOT EXISTS installment_plans_user_status_idx
  ON public.installment_plans(user_id, status);

CREATE INDEX IF NOT EXISTS installment_payments_plan_idx
  ON public.installment_payments(plan_id, sequence_number);

CREATE INDEX IF NOT EXISTS installment_payments_user_due_idx
  ON public.installment_payments(user_id, due_date);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_installment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_installment_plans_updated_at ON public.installment_plans;
CREATE TRIGGER trg_installment_plans_updated_at
  BEFORE UPDATE ON public.installment_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_installment_updated_at();

DROP TRIGGER IF EXISTS trg_installment_payments_updated_at ON public.installment_payments;
CREATE TRIGGER trg_installment_payments_updated_at
  BEFORE UPDATE ON public.installment_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_installment_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

ALTER TABLE public.installment_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

-- Plans: each user only sees / mutates their own rows. CHECK pins the
-- user_id on insert so a malicious client can't drop someone else's
-- user_id into a write.
DROP POLICY IF EXISTS "installment_plans_owner_select" ON public.installment_plans;
CREATE POLICY "installment_plans_owner_select" ON public.installment_plans
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "installment_plans_owner_insert" ON public.installment_plans;
CREATE POLICY "installment_plans_owner_insert" ON public.installment_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "installment_plans_owner_update" ON public.installment_plans;
CREATE POLICY "installment_plans_owner_update" ON public.installment_plans
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "installment_plans_owner_delete" ON public.installment_plans;
CREATE POLICY "installment_plans_owner_delete" ON public.installment_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Payments: same scoping. Cascading delete is already enforced at the
-- FK level (ON DELETE CASCADE on plan_id), but the RLS DELETE policy
-- still applies for direct payment deletes.
DROP POLICY IF EXISTS "installment_payments_owner_select" ON public.installment_payments;
CREATE POLICY "installment_payments_owner_select" ON public.installment_payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "installment_payments_owner_insert" ON public.installment_payments;
CREATE POLICY "installment_payments_owner_insert" ON public.installment_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "installment_payments_owner_update" ON public.installment_payments;
CREATE POLICY "installment_payments_owner_update" ON public.installment_payments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "installment_payments_owner_delete" ON public.installment_payments;
CREATE POLICY "installment_payments_owner_delete" ON public.installment_payments
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Comments (audit + onboarding)
-- ---------------------------------------------------------------------

COMMENT ON TABLE public.installment_plans IS
  'Pay Later (BNPL) plans — Klarna / Affirm / Afterpay / Shop Pay / PayPal Pay in 4 / Sezzle / Zip. One row per plan; payments live in installment_payments. RLS: row owner only.';

COMMENT ON TABLE public.installment_payments IS
  'Scheduled installment payments for a Pay Later plan. ON DELETE CASCADE removes payments when the plan is deleted. RLS: row owner only.';

COMMENT ON COLUMN public.installment_plans.provider IS
  'PayLaterProvider raw value (klarna/affirm/afterpay/shopPayInstallments/paypalPayIn4/sezzle/zip/other).';
COMMENT ON COLUMN public.installment_plans.status IS
  'PayLaterPlanStatus raw value (active/paid/overdue/canceled/unknown).';
COMMENT ON COLUMN public.installment_plans.remaining_balance IS
  'Snapshot from scan / manual entry. The runtime "remaining" the UI shows is derived from the payments table.';
COMMENT ON COLUMN public.installment_payments.status IS
  'PayLaterPaymentStatus raw value (scheduled/paid/overdue/missed/refunded/unknown).';
COMMENT ON COLUMN public.installment_payments.due_date IS
  'Local calendar date (no time component) — matches bills.due_date convention so a payment due May 25 always reads as May 25.';
