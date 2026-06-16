-- Add bill-identity fields to support the v2 scan pipeline.
-- Migration: 20260521_add_bill_identity_fields.sql
--
-- All columns are NULLABLE with no default beyond NULL, so existing
-- rows and existing clients are unaffected: legacy bills simply have
-- NULL identity fields, and older app builds that don't send these
-- keys continue to insert/update exactly as before. RLS is row-level
-- (auth.uid() = user_id) and applies to these new columns
-- automatically — no policy changes required.

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS vendor_brand TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vendor_legal_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bill_display_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_identifier_last4 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS account_nickname TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bill_account_key TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS identity_confidence TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_document_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS minimum_due DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS statement_balance DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS raw_source_text TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS detected_subject_text TEXT DEFAULT NULL;

-- Payment history is keyed on bill_account_key so that, e.g., a
-- "Chase Auto" statement never attaches to "Chase Credit Card"
-- history. Index it per-user for fast lookups.
CREATE INDEX IF NOT EXISTS bills_bill_account_key_idx
  ON public.bills(user_id, bill_account_key);

COMMENT ON COLUMN public.bills.vendor_brand IS 'Canonical vendor brand, e.g. "Chase" (normalized from the legal name).';
COMMENT ON COLUMN public.bills.vendor_legal_name IS 'Legal entity name as printed, e.g. "JPMorgan Chase & Co.". Audit/secondary only.';
COMMENT ON COLUMN public.bills.bill_display_name IS 'User-facing name, e.g. "Chase Credit Card" / "Chase Auto".';
COMMENT ON COLUMN public.bills.account_type IS 'BillAccountType raw value, e.g. creditCard, autoLoan.';
COMMENT ON COLUMN public.bills.service_category IS 'BillServiceCategory raw value, e.g. creditCard, loan.';
COMMENT ON COLUMN public.bills.account_identifier_last4 IS 'Last 4 of the account/card. Treat as PII; never log.';
COMMENT ON COLUMN public.bills.bill_account_key IS 'Stable per-account key (user:vendor:type:last4) for payment-history matching.';
COMMENT ON COLUMN public.bills.identity_confidence IS 'BillIdentityConfidence raw value: unknown/low/medium/strong/high.';
COMMENT ON COLUMN public.bills.source_document_type IS 'BillSourceDocumentType raw value: scan/photo/emailScreenshot/manual/unknown.';
COMMENT ON COLUMN public.bills.payment_status IS 'BillPaymentStatus raw value: statementReady/minimumDue/etc.';
COMMENT ON COLUMN public.bills.minimum_due IS 'Credit-card minimum payment, when shown.';
COMMENT ON COLUMN public.bills.statement_balance IS 'Statement balance, when shown.';
COMMENT ON COLUMN public.bills.document_type IS 'Scan document classification, e.g. credit_card_statement.';
COMMENT ON COLUMN public.bills.raw_source_text IS 'Raw OCR/visible text captured at scan time. May contain PII; never log.';
COMMENT ON COLUMN public.bills.detected_subject_text IS 'Email subject/title detected at scan time (dominant identity signal).';
