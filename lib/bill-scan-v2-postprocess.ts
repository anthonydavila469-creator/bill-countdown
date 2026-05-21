/**
 * Bill Scan v2 — deterministic post-processing (Phase 3).
 *
 * Runs after the Claude vision call (Phase 2 mapper) and before the
 * `/api/bills/scan` v2 response is sent. The model's classification is
 * treated as a hint; THIS layer is the source of truth for identity. It
 * re-derives vendor brand, account type, service category, display
 * name, payment-confirmation status, and identity confidence purely
 * from the OCR'd text fields using the rules in
 * `docs/bill-scan-v2-spec.md` — so the result is stable and testable
 * regardless of model wording drift.
 *
 * Core principles (spec §3, §5, §6):
 *  - Subject/title and body text OUTRANK the generic Gmail smart-card
 *    text. The smart card sets the vendor only and is LOW identity
 *    evidence; it never sets the account type.
 *  - Identity confidence is separate from the numeric extraction
 *    confidence (amount/due-date OCR). A missing amount does not lower
 *    identity confidence, and a confident identity does not imply a
 *    complete bill.
 *  - Payment confirmations are not unpaid bills.
 *
 * Pure module: only type-only imports, no Anthropic/Next/Supabase, so
 * it runs under the Node test runner.
 */

import type {
  BillScanV2,
  V2AccountType,
  V2ServiceCategory,
  V2IdentityConfidence,
} from './bill-scan-v2';

// ---------------------------------------------------------------------------
// Rule tables
// ---------------------------------------------------------------------------

/**
 * Vendor legal/raw name -> canonical brand. Lowercased keys; matched as
 * substrings against the candidate name. Longest keys first so
 * "jpmorgan chase & co." wins over a bare "chase". Source: spec §5
 * plus the explicit Chase variants required for Phase 3.
 */
const VENDOR_BRAND_RULES: ReadonlyArray<[pattern: string, brand: string]> = [
  ['jpmorgan chase & co.', 'Chase'],
  ['jpmorgan chase & co', 'Chase'],
  ['jpmorgan chase', 'Chase'],
  ['jp morgan chase', 'Chase'],
  ['chase bank, n.a.', 'Chase'],
  ['chase bank', 'Chase'],
  ['chase', 'Chase'],
  ['capital one financial', 'Capital One'],
  ['capital one bank', 'Capital One'],
  ['capital one', 'Capital One'],
  ['wells fargo & company', 'Wells Fargo'],
  ['wells fargo bank', 'Wells Fargo'],
  ['wells fargo', 'Wells Fargo'],
  ['comcast cable', 'Xfinity'],
  ['comcast', 'Xfinity'],
  ['xfinity', 'Xfinity'],
  ['charter communications', 'Spectrum'],
  ['spectrum', 'Spectrum'],
];

const CREDIT_CARD_PHRASES: readonly string[] = [
  'credit card statement',
  'minimum due',
  'minimum payment',
  'statement balance',
  'card ending',
  'visa',
  'mastercard',
  'credit card payment',
  'credit card',
];

const AUTO_LOAN_PHRASES: readonly string[] = [
  'auto account statement',
  'auto account',
  'auto loan',
  'vehicle',
  'car payment',
];

const PAYMENT_CONFIRMATION_PHRASES: readonly string[] = [
  'payment scheduled',
  'payment authorized',
  'thank you for scheduling',
  'effective date',
  'payment confirmation',
];

/** Brands that already imply their bill type — skip the " Bill" suffix. */
const SERVICE_IMPLYING_BRANDS: ReadonlySet<string> = new Set([
  'Netflix', 'Spotify', 'Hulu', 'Disney+', 'Apple', 'Google', 'Amazon',
]);

const ACCOUNT_TYPE_SUFFIX: Partial<Record<V2AccountType, string>> = {
  autoLoan: 'Auto',
  creditCard: 'Credit Card',
  mortgage: 'Mortgage',
  wireless: 'Wireless',
  internet: 'Internet',
  electric: 'Electric',
  gas: 'Gas',
  water: 'Water',
  insurance: 'Insurance',
  rent: 'Rent',
};

const SERVICE_CATEGORY_BY_ACCOUNT: Record<V2AccountType, V2ServiceCategory> = {
  autoLoan: 'loan',
  creditCard: 'creditCard',
  mortgage: 'mortgage',
  wireless: 'telecom',
  internet: 'telecom',
  electric: 'utility',
  gas: 'utility',
  water: 'utility',
  insurance: 'insurance',
  streaming: 'streaming',
  subscription: 'streaming',
  rent: 'housing',
  other: 'other',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lower(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join('\n')
    .toLowerCase();
}

/** Canonical brand from a single candidate name, or null if unknown. */
export function normalizeVendorBrand(name: string | null | undefined): string | null {
  if (!name) return null;
  const l = name.toLowerCase();
  for (const [pattern, brand] of VENDOR_BRAND_RULES) {
    if (l.includes(pattern)) return brand;
  }
  return null;
}

function containsAny(haystack: string, phrases: readonly string[]): string | null {
  for (const phrase of phrases) {
    if (haystack.includes(phrase)) return phrase;
  }
  return null;
}

/**
 * Detect the account type from high-trust text (subject + body + full
 * OCR). Credit-card phrases are checked before auto-loan phrases per
 * the spec ladder. The Gmail smart-card text is intentionally NOT
 * passed here.
 */
export function detectAccountType(highTrustText: string): { type: V2AccountType; phrase: string } | null {
  const cc = containsAny(highTrustText, CREDIT_CARD_PHRASES);
  if (cc) return { type: 'creditCard', phrase: cc };
  const auto = containsAny(highTrustText, AUTO_LOAN_PHRASES);
  if (auto) return { type: 'autoLoan', phrase: auto };
  return null;
}

export function serviceCategoryFor(accountType: V2AccountType | null): V2ServiceCategory | null {
  return accountType ? SERVICE_CATEGORY_BY_ACCOUNT[accountType] : null;
}

/**
 * User-facing display name. `{Brand} {Type}` when both are known;
 * `{Brand} Bill` when only the brand is known (except service-implying
 * brands, which use the bare brand). Never the legal entity name and
 * never "Type unknown". Falls back to the existing display name or
 * vendor raw name when no brand is resolved.
 */
export function displayNameFor(
  brand: string | null,
  accountType: V2AccountType | null,
  fallback: string | null,
): string | null {
  if (brand && accountType) {
    const suffix = ACCOUNT_TYPE_SUFFIX[accountType];
    return suffix ? `${brand} ${suffix}` : brand;
  }
  if (brand) {
    return SERVICE_IMPLYING_BRANDS.has(brand) ? brand : `${brand} Bill`;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Post-processor
// ---------------------------------------------------------------------------

/**
 * Apply deterministic identity rules to a mapped v2 object and return a
 * corrected copy. Idempotent.
 */
export function postProcessBillScanV2(input: BillScanV2): BillScanV2 {
  const out: BillScanV2 = { ...input };

  // High-trust text: subject + body + full OCR. The Gmail smart-card
  // text is excluded — it is low identity evidence and never sets the
  // account type.
  const highTrustText = lower(out.detectedSubjectText, out.detectedBodyText, out.rawVisibleText);
  const smartCardText = lower(out.detectedSmartCardText);

  // --- Vendor brand -------------------------------------------------------
  // Prefer the legal/raw name, then any model brand, then high-trust
  // text, then the (low-evidence) smart-card text.
  const brand =
    normalizeVendorBrand(out.vendorLegalName) ??
    normalizeVendorBrand(out.vendorRawName) ??
    normalizeVendorBrand(out.vendorBrand) ??
    normalizeVendorBrand(highTrustText) ??
    normalizeVendorBrand(smartCardText) ??
    out.vendorBrand ?? // keep a non-normalized model brand if present
    null;
  out.vendorBrand = brand;

  // Preserve the printed legal name when the canonical brand differs
  // from it (e.g. "JPMorgan Chase & Co." -> brand "Chase").
  if (!out.vendorLegalName) {
    const rawLooksLegal =
      out.vendorRawName && brand && out.vendorRawName.toLowerCase() !== brand.toLowerCase()
        ? out.vendorRawName
        : null;
    out.vendorLegalName = rawLooksLegal;
  }

  // --- Account type -------------------------------------------------------
  // Only from high-trust text. A vendor-only smart card yields no type.
  const detected = detectAccountType(highTrustText);
  const accountType = detected?.type ?? out.accountType ?? null;
  // If the only source of the account type was the model (no phrase in
  // our high-trust text and no high-trust source), keep the model value
  // but it will not earn `high` identity confidence below.
  out.accountType = accountType;
  out.serviceCategory = serviceCategoryFor(accountType) ?? out.serviceCategory ?? null;

  // --- Payment confirmation vs bill --------------------------------------
  const allText = `${highTrustText}\n${smartCardText}`;
  const paymentPhrase = containsAny(allText, PAYMENT_CONFIRMATION_PHRASES);
  if (paymentPhrase) {
    out.isPaymentConfirmation = true;
    out.isBill = false; // a confirmation is not an unpaid bill
    if (!out.paymentStatus) out.paymentStatus = 'paymentScheduled';
  } else if (out.isPaymentConfirmation == null) {
    out.isPaymentConfirmation = false;
  }

  // --- Display name -------------------------------------------------------
  out.billDisplayName = displayNameFor(brand, accountType, out.billDisplayName ?? out.vendorRawName);

  // --- Identity confidence (separate from numeric extraction conf.) ------
  // high: brand + account type derived from high-trust text.
  // medium: account type known but no brand.
  // low: brand only (e.g. vendor-only Gmail smart card).
  // unknown: neither.
  let identity: V2IdentityConfidence;
  if (brand && detected) identity = 'high';
  else if (brand && accountType) identity = 'high'; // model-supplied type + brand
  else if (accountType) identity = 'medium';
  else if (brand) identity = 'low';
  else identity = 'unknown';
  out.identityConfidence = identity;

  // --- Review flags (extraction completeness, NOT identity) --------------
  // Identity can be high while the bill is still incomplete. Only flag
  // missing amount/due date for actual bills.
  const reasons: string[] = [];
  if (out.reviewReason) reasons.push(out.reviewReason);
  if (out.isBill) {
    if (out.amountDue == null) reasons.push('missing amount');
    if (out.dueDate == null) reasons.push('missing due date');
  }
  if (reasons.length > 0) {
    out.reviewNeeded = true;
    out.reviewReason = Array.from(new Set(reasons)).join('; ');
  }

  return out;
}
