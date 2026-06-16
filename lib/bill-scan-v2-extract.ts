/**
 * Bill Scan v2 — Claude vision extraction (Phase 2).
 *
 * Phase 1 defined the v2 *schema* (`lib/bill-scan-v2.ts`) and attached
 * a null-filled `v2` object built from the legacy v1 pipeline. Phase 2
 * (this file) adds the dedicated Claude vision PROMPT that OCRs the
 * full screenshot — including the email subject/header bar that the v1
 * prompt never reads — and classifies the bill identity per
 * `docs/bill-scan-v2-spec.md`.
 *
 * This module is pure (no Anthropic / Next / Supabase imports): it owns
 * the prompt text, a strict parser, and a deterministic mapper from the
 * model's JSON into the `BillScanV2` schema. The route issues the
 * actual vision call and feeds the response text through here. That
 * keeps the prompt reviewable and the parse/map unit-testable without
 * the network.
 *
 * Scope (Phase 2): the PROMPT does the classification. We intentionally
 * do NOT add a deterministic post-processor (vendor-normalization
 * tables, account-type re-derivation, payment-history keying) here —
 * that is a later phase. The mapper trusts the model's normalized
 * fields and only shapes/﻿validates them.
 */

// Type-only import: erased at runtime, so this module has no runtime
// dependency on the schema module (keeps the unit tests runnable under
// bare Node, which can't resolve the extensionless build-style import).
// The route passes in `fallbackSourceDocumentType` (computed via the
// schema module's `mapSourceDocumentType`) so we don't duplicate it.
import type {
  BillScanV2,
  V2AccountType,
  V2ServiceCategory,
  V2PaymentStatus,
  V2SourceDocumentType,
  V2IdentityConfidence,
} from './bill-scan-v2';

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

/**
 * The v2 vision prompt. Forces full-screenshot OCR, reads every text
 * region (subject/header, sender, Gmail smart card, body, statement,
 * payment confirmation), separates bills from payment confirmations,
 * applies the spec §3 priority ladder + §5 normalization + §6 display
 * rules, and returns strict JSON.
 */
export const BILL_SCAN_V2_PROMPT = `You are a meticulous OCR and bill-identity classifier. The image is a photo or screenshot of a bill, a bank/credit-card statement notification, an email, or a Gmail "smart bill" card. Read the ENTIRE image top to bottom. Do NOT ignore or crop out the email subject line, title bar, or header — those are the most important identity signals.

Return ONLY valid minified JSON, no markdown, no code fences, no commentary. Use this exact shape (return every key; use null when a value is genuinely not visible):

{
  "raw_visible_text": "all text you can read in the image, top to bottom",
  "subject_text": "the email subject / title / header line, verbatim, or null",
  "sender_name": "the sender display name, or null",
  "sender_domain": "the sender email domain e.g. chase.com, or null",
  "smart_card_text": "the Gmail smart bill card text e.g. 'JPMorgan Chase & Co. bill', or null",
  "body_text": "the visible email/body text, or null",
  "vendor_raw_name": "the vendor name exactly as printed, or null",
  "vendor_brand": "the normalized canonical brand, or null",
  "vendor_legal_name": "the legal entity name if shown e.g. 'JPMorgan Chase & Co.', or null",
  "bill_display_name": "the user-facing name per the display rules below, or null",
  "account_type": "one of: autoLoan, creditCard, mortgage, wireless, internet, electric, gas, water, insurance, streaming, rent, subscription, other — or null",
  "service_category": "one of: loan, creditCard, mortgage, utility, telecom, insurance, streaming, housing, other — or null",
  "amount_due": 70.00,
  "minimum_due": 40.00,
  "statement_balance": 70.00,
  "due_date": "2026-06-11",
  "payment_amount": null,
  "payment_date": null,
  "payment_status": "one of: unknown, statementReady, paymentScheduled, paymentReceived, overdue, minimumDue — or null",
  "document_type": "short snake_case e.g. credit_card_statement, auto_loan_statement, utility_bill, payment_confirmation, non_bill, unknown",
  "source_document_type": "one of: scan, photo, emailScreenshot, manual, unknown",
  "is_bill": true,
  "is_payment_confirmation": false,
  "confidence": { "vendor": 0.95, "account_type": 0.96, "amount": 0.9, "due_date": 0.85, "overall": 0.92 },
  "evidence": {
    "vendor_text": "exact text that identifies the vendor, or null",
    "account_type_text": "exact text that identifies the account type, or null",
    "amount_text": "exact text for the amount, or null",
    "due_date_text": "exact text for the due date, or null",
    "raw_text": "compact summary of the lines you relied on, or null"
  },
  "review_needed": false,
  "review_reason": "short reason if review is needed, else null",
  "warnings": []
}

ACCOUNT TYPE PRIORITY LADDER (evaluate in order; stop at the first match). The subject/title/body wording OUTRANKS the generic Gmail smart card vendor text:
1. subject/title or body contains "credit card statement" -> account_type = creditCard
2. visible text contains "minimum due" or "minimum payment" -> account_type = creditCard
3. visible text contains "statement balance" -> account_type = creditCard
4. visible text contains "Visa", "Mastercard", or "card ending" -> account_type = creditCard
5. subject/title contains "auto account statement" -> account_type = autoLoan
6. visible text contains "auto loan", "vehicle", or "car payment" -> account_type = autoLoan
7. The Gmail smart card vendor name (e.g. "JPMorgan Chase & Co. bill") sets the VENDOR ONLY. NEVER infer account_type from the smart card vendor name alone.
Map account_type to service_category: autoLoan->loan, creditCard->creditCard, mortgage->mortgage, wireless/internet->telecom, electric/gas/water->utility, insurance->insurance, streaming/subscription->streaming, rent->housing, other->other.

VENDOR NORMALIZATION (set vendor_brand to the canonical brand; keep the printed legal name in vendor_legal_name):
- "JPMorgan Chase & Co.", "JPMorgan Chase", "JP Morgan Chase", "Chase Bank", "Chase Bank, N.A." -> vendor_brand "Chase"
- "Capital One Financial", "Capital One Bank" -> "Capital One"
- "Wells Fargo & Company", "Wells Fargo Bank" -> "Wells Fargo"
- "Comcast", "Comcast Cable" -> "Xfinity"
- "Charter Communications" -> "Spectrum"
- Otherwise use the clearest brand name shown.

DISPLAY NAME RULES (bill_display_name):
- vendor_brand + account_type known: combine as "{Brand} {Type}". creditCard -> "{Brand} Credit Card"; autoLoan -> "{Brand} Auto"; mortgage -> "{Brand} Mortgage"; wireless -> "{Brand} Wireless"; internet -> "{Brand} Internet".
  Examples: Chase + creditCard -> "Chase Credit Card"; Chase + autoLoan -> "Chase Auto".
- Service-implying brands (Netflix, Spotify, Hulu, Disney+, Apple, Google, Amazon): just the brand, no suffix.
- vendor_brand known but account_type null: "{Brand} Bill" (e.g. "Chase Bill").
- NEVER output the legal entity name (e.g. "JPMorgan Chase & Co.") as bill_display_name when an account_type is visible. NEVER output "Type unknown". NEVER output "Chase Bill" (or any "{Brand} Bill") when an account_type IS visible — use the typed name instead.

BILL vs PAYMENT CONFIRMATION (separate them):
- A bill / statement requests money: set is_bill = true, is_payment_confirmation = false. Fill amount_due / due_date / minimum_due / statement_balance.
- A payment confirmation / receipt ("payment received", "payment posted", "thank you for your payment", "your payment of $X was received") confirms money already paid: set is_payment_confirmation = true, is_bill = false (unless it ALSO contains a new future statement). Fill payment_amount, payment_date, payment_status = paymentReceived. Leave amount_due/due_date null unless a new bill is also present.
- payment_status: use minimumDue when only a minimum is shown, statementReady when a statement is newly available, overdue for past-due, paymentScheduled for a scheduled payment, paymentReceived for a confirmed payment.

AMOUNTS:
- amount_due: the TOTAL amount due / statement balance / balance due. Never the minimum payment.
- minimum_due: the minimum payment if shown, else null.
- statement_balance: the statement balance if shown, else null.

GENERAL:
- source_document_type: "emailScreenshot" if the image shows email chrome (subject, sender, smart card); "scan"/"photo" for a photographed paper bill; "unknown" if unclear.
- due_date / payment_date in YYYY-MM-DD.
- confidence: 0..1 per field plus overall.
- review_needed: true with a short review_reason when a key field is ambiguous, conflicting, or missing.
- Return strictly the JSON object above and nothing else.`;

// ---------------------------------------------------------------------------
// Model result type + parser
// ---------------------------------------------------------------------------

export interface BillScanV2ClaudeResult {
  raw_visible_text?: string | null;
  subject_text?: string | null;
  sender_name?: string | null;
  sender_domain?: string | null;
  smart_card_text?: string | null;
  body_text?: string | null;
  vendor_raw_name?: string | null;
  vendor_brand?: string | null;
  vendor_legal_name?: string | null;
  bill_display_name?: string | null;
  account_type?: string | null;
  service_category?: string | null;
  amount_due?: number | string | null;
  minimum_due?: number | string | null;
  statement_balance?: number | string | null;
  due_date?: string | null;
  payment_amount?: number | string | null;
  payment_date?: string | null;
  payment_status?: string | null;
  document_type?: string | null;
  source_document_type?: string | null;
  identity_confidence?: string | null;
  is_bill?: boolean | null;
  is_payment_confirmation?: boolean | null;
  confidence?: {
    vendor?: number | null;
    account_type?: number | null;
    amount?: number | null;
    due_date?: number | null;
    overall?: number | null;
  } | null;
  evidence?: {
    vendor_text?: string | null;
    account_type_text?: string | null;
    amount_text?: string | null;
    due_date_text?: string | null;
    raw_text?: string | null;
  } | null;
  review_needed?: boolean | null;
  review_reason?: string | null;
  warnings?: unknown;
}

/**
 * Strictly parse the model's text into a `BillScanV2ClaudeResult`.
 * Strips an accidental markdown fence, requires a JSON object, and
 * returns null on any failure so the route can fall back to the
 * Phase 1 null-filled v2 object.
 */
export function parseBillScanV2Claude(text: string | null | undefined): BillScanV2ClaudeResult | null {
  if (!text || typeof text !== 'string') return null;
  const stripped = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  if (!stripped.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(stripped);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as BillScanV2ClaudeResult;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

const ACCOUNT_TYPES: ReadonlySet<string> = new Set<V2AccountType>([
  'autoLoan', 'creditCard', 'mortgage', 'wireless', 'internet', 'electric',
  'gas', 'water', 'insurance', 'streaming', 'rent', 'subscription', 'other',
]);
const SERVICE_CATEGORIES: ReadonlySet<string> = new Set<V2ServiceCategory>([
  'loan', 'creditCard', 'mortgage', 'utility', 'telecom', 'insurance',
  'streaming', 'housing', 'other',
]);
const PAYMENT_STATUSES: ReadonlySet<string> = new Set<V2PaymentStatus>([
  'unknown', 'statementReady', 'paymentScheduled', 'paymentReceived', 'overdue', 'minimumDue',
]);
const SOURCE_DOC_TYPES: ReadonlySet<string> = new Set<V2SourceDocumentType>([
  'scan', 'photo', 'emailScreenshot', 'manual', 'unknown',
]);
const IDENTITY_CONFIDENCES: ReadonlySet<string> = new Set<V2IdentityConfidence>([
  'unknown', 'low', 'medium', 'strong', 'high',
]);

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.-]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function enumOrNull<T extends string>(v: unknown, allowed: ReadonlySet<string>): T | null {
  const s = str(v);
  return s && allowed.has(s) ? (s as T) : null;
}

function confNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Inputs the route supplies alongside the model result. amount/dueDate
 * come from the existing v1 ranker (proven resolution + year
 * reconciliation); the v2 model result supplies the new identity and
 * payment fields. This keeps v1 and v2 amounts consistent.
 */
export interface MapClaudeV2Context {
  scanSessionId: string;
  /**
   * Source document type derived from the capture channel via the
   * schema module's `mapSourceDocumentType`. Used only when the model
   * does not return a valid `source_document_type`.
   */
  fallbackSourceDocumentType: V2SourceDocumentType;
  /** Ranker-resolved amount due (preferred over the model's amount). */
  resolvedAmountDue: number | null;
  /** Ranker-resolved due date (preferred over the model's due date). */
  resolvedDueDate: string | null;
}

/**
 * Deterministically shape a parsed model result into the `BillScanV2`
 * schema. No reclassification: enum fields are validated against the
 * spec's allowed values (invalid -> null), numbers are coerced, the
 * resolved amount/dueDate win over the model's, and source document
 * type prefers the model's detection but falls back to the capture
 * channel map.
 */
export function mapClaudeV2ToBillScanV2(
  claude: BillScanV2ClaudeResult,
  ctx: MapClaudeV2Context,
): BillScanV2 {
  const warnings = Array.isArray(claude.warnings)
    ? claude.warnings.filter((w: unknown): w is string => typeof w === 'string')
    : [];

  const sourceDocFromModel = enumOrNull<V2SourceDocumentType>(claude.source_document_type, SOURCE_DOC_TYPES);

  return {
    scanSessionId: ctx.scanSessionId,

    rawVisibleText: str(claude.raw_visible_text),
    detectedSubjectText: str(claude.subject_text),
    detectedSenderName: str(claude.sender_name),
    detectedSenderDomain: str(claude.sender_domain),
    detectedSmartCardText: str(claude.smart_card_text),
    detectedBodyText: str(claude.body_text),

    vendorRawName: str(claude.vendor_raw_name),
    vendorBrand: str(claude.vendor_brand),
    vendorLegalName: str(claude.vendor_legal_name),
    billDisplayName: str(claude.bill_display_name),

    accountType: enumOrNull<V2AccountType>(claude.account_type, ACCOUNT_TYPES),
    serviceCategory: enumOrNull<V2ServiceCategory>(claude.service_category, SERVICE_CATEGORIES),

    // Resolved amount/dueDate win; model values fill only when the
    // ranker produced nothing.
    amountDue: ctx.resolvedAmountDue ?? num(claude.amount_due),
    minimumDue: num(claude.minimum_due),
    statementBalance: num(claude.statement_balance),
    dueDate: ctx.resolvedDueDate ?? str(claude.due_date),

    paymentAmount: num(claude.payment_amount),
    paymentDate: str(claude.payment_date),
    paymentStatus: enumOrNull<V2PaymentStatus>(claude.payment_status, PAYMENT_STATUSES),

    documentType: str(claude.document_type),
    sourceDocumentType: sourceDocFromModel ?? ctx.fallbackSourceDocumentType,
    isBill: typeof claude.is_bill === 'boolean' ? claude.is_bill : false,
    isPaymentConfirmation:
      typeof claude.is_payment_confirmation === 'boolean' ? claude.is_payment_confirmation : null,

    confidence: confNum(claude.confidence?.overall),
    fieldConfidence: {
      vendorName: confNum(claude.confidence?.vendor),
      amountDue: confNum(claude.confidence?.amount),
      dueDate: confNum(claude.confidence?.due_date),
    },
    // Model-reported identity confidence is a hint only; the Phase 3
    // post-processor recomputes this deterministically. Validate the
    // enum here; invalid/missing -> null.
    identityConfidence: enumOrNull<V2IdentityConfidence>(claude.identity_confidence, IDENTITY_CONFIDENCES),
    evidence: {
      vendorText: str(claude.evidence?.vendor_text),
      amountText: str(claude.evidence?.amount_text),
      dueDateText: str(claude.evidence?.due_date_text),
      rawText: str(claude.evidence?.raw_text),
    },

    reviewNeeded: typeof claude.review_needed === 'boolean' ? claude.review_needed : false,
    reviewReason: str(claude.review_reason),
    warnings,
  };
}
