/**
 * Pay Later scan post-processor.
 *
 * Phase 10 (Pay Later screenshot scan): given the v2 bill-scan extract
 * (vendor / amount / due date / raw OCR text), this module
 *   1. classifies the screenshot as bill / payLaterPlan /
 *      paymentConfirmation / unknown, and
 *   2. when the classification is payLaterPlan, produces a deterministic
 *      PayLater object the iOS client can render in the review sheet.
 *
 * Deliberately a pure deterministic function over the existing v2 vision
 * output — does NOT make a second model call. Schedule extraction is
 * best-effort from the limited raw OCR text the v2 extractor returns
 * (vendor + amount lines + nearby phrases). When the text doesn't give
 * us enough to fill in the schedule, we set `reviewNeeded: true` and let
 * the user finish the entry in the review sheet.
 */

// MARK: - Public types

export type PayLaterProviderRaw =
  | 'klarna'
  | 'affirm'
  | 'afterpay'
  | 'shopPayInstallments'
  | 'paypalPayIn4'
  | 'sezzle'
  | 'zip'
  | 'other';

export type PayLaterScanClassification =
  | 'bill'
  | 'payLaterPlan'
  | 'paymentConfirmation'
  | 'unknown';

export type PayLaterPaymentStatus =
  | 'scheduled'
  | 'paid'
  | 'overdue'
  | 'missed'
  | 'refunded'
  | 'unknown';

export type PayLaterExtractionConfidence = 'low' | 'medium' | 'high';

export type PayLaterScanPurpose = 'bill' | 'payLater' | 'auto';

export interface PayLaterExtractedPayment {
  sequenceNumber: number;
  dueDate: string | null;
  amount: number | null;
  status: PayLaterPaymentStatus;
}

export interface PayLaterScanObject {
  provider: PayLaterProviderRaw;
  providerDisplayName: string;
  merchantName: string | null;
  purchaseTitle: string | null;
  orderIdentifier: string | null;
  originalAmount: number | null;
  financedAmount: number | null;
  downPayment: number | null;
  remainingBalance: number | null;
  currency: string | null;
  planType: string | null;
  installmentCount: number | null;
  intervalDays: number | null;
  apr: number | null;
  interestAmount: number | null;
  feeAmount: number | null;
  paymentMethodLast4: string | null;
  isAutopay: boolean | null;
  payments: PayLaterExtractedPayment[];
  rawVisibleText: string | null;
  extractionConfidence: PayLaterExtractionConfidence;
  reviewNeeded: boolean;
  reviewReason: string | null;
}

export interface PayLaterClassifyInput {
  /** Raw OCR text snippet the v2 extractor returned (lower-case is fine). */
  rawText: string | null;
  /** Vendor / brand the v1 ranker pulled, if any. */
  vendorName: string | null;
  /** Resolved amount-due from the v1 ranker, if any. */
  amountDue: number | null;
  /** Resolved due date (YYYY-MM-DD) from the v1 ranker, if any. */
  dueDate: string | null;
  /** Caller-requested purpose (`bill` keeps the bills behavior verbatim). */
  scanPurpose: PayLaterScanPurpose;
}

export interface PayLaterClassifyOutput {
  classification: PayLaterScanClassification;
  payLater: PayLaterScanObject | null;
}

// MARK: - Provider normalization

/**
 * Canonical provider keyword table. The longer / more specific entries
 * are evaluated FIRST so "Shop Pay Installments powered by Affirm" maps
 * to shopPayInstallments instead of affirm, and "Cash App Afterpay" maps
 * to afterpay rather than something generic. Order matters.
 */
const PROVIDER_KEYWORDS: ReadonlyArray<{
  matchers: ReadonlyArray<string>;
  provider: PayLaterProviderRaw;
  displayName: string;
}> = [
  // Shop Pay Installments — longer/more-specific matchers first so the
  // co-branded "Shop Pay Installments powered by Affirm" doesn't get
  // shadowed by the plain "affirm" entry below. We also detect Shop
  // Pay via its product URLs (shop.app, shop.affirm.com) and the
  // marketing line "Installments provided by Affirm" — both common in
  // Shop Pay screen captures + Shop Pay payment-schedule emails.
  {
    matchers: [
      'shop pay installments',
      'shoppay installments',
      'installments provided by affirm',
      'shop.affirm.com',
      'shop.app',
    ],
    provider: 'shopPayInstallments',
    displayName: 'Shop Pay Installments',
  },
  { matchers: ['pay in 4 with paypal', 'paypal pay in 4', 'pay later with paypal'], provider: 'paypalPayIn4', displayName: 'PayPal Pay in 4' },
  { matchers: ['cash app afterpay', 'afterpay', 'after pay'], provider: 'afterpay', displayName: 'Afterpay' },
  { matchers: ['klarna'], provider: 'klarna', displayName: 'Klarna' },
  { matchers: ['affirm'], provider: 'affirm', displayName: 'Affirm' },
  { matchers: ['sezzle'], provider: 'sezzle', displayName: 'Sezzle' },
  { matchers: ['quadpay', 'zip pay', 'zip co', ' zip '], provider: 'zip', displayName: 'Zip' },
  // Fallback Shop Pay matchers (after the brand-specific BNPL providers
  // above) so a generic "shop pay" mention still resolves correctly.
  { matchers: ['shop pay', 'shoppay'], provider: 'shopPayInstallments', displayName: 'Shop Pay Installments' },
];

/**
 * Returns the normalized provider for the given free text, or null when
 * nothing matches. Tries the OCR raw text first, then the vendor name —
 * vendor name is usually a one-word brand, while raw text often carries
 * the longer co-branded phrasing ("Shop Pay Installments powered by
 * Affirm") that needs to be evaluated first.
 */
export function normalizePayLaterProvider(
  rawText: string | null,
  vendorName: string | null
): { provider: PayLaterProviderRaw; displayName: string } | null {
  const haystacks: string[] = [];
  if (rawText) haystacks.push(rawText.toLowerCase());
  if (vendorName) haystacks.push(` ${vendorName.toLowerCase()} `); // pad so " zip " matches

  for (const haystack of haystacks) {
    for (const entry of PROVIDER_KEYWORDS) {
      if (entry.matchers.some((m) => haystack.includes(m))) {
        return { provider: entry.provider, displayName: entry.displayName };
      }
    }
  }
  return null;
}

// MARK: - Classification phrase lists

const SCHEDULE_PHRASES = [
  'pay in 4',
  'payment schedule',
  'installment',
  'installments',
  'next payment',
  'upcoming payment',
  'every two weeks',
  'every 2 weeks',
  'biweekly',
  'pay over time',
  'monthly payments',
];

const PAYMENT_CONFIRMATION_PHRASES = [
  'payment completed',
  'payment received',
  'thank you for your payment',
  'payment confirmation',
  'payment has been processed',
  'we received your payment',
];

const FUTURE_PAYMENT_PHRASES = [
  'next payment',
  'upcoming payment',
  'remaining',
  'remaining payments',
  'remaining balance',
  'due on',
  'due ',
];

function containsAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

// MARK: - Classification

/**
 * Classifies the scan as bill / payLaterPlan / paymentConfirmation /
 * unknown. Honors `scanPurpose`:
 *   - "bill"     → never classify as Pay Later (caller doesn't want it)
 *   - "payLater" → only classify as Pay Later (or unknown)
 *   - "auto"    → pick the best fit
 *
 * Phase 12 changes:
 *   - Multiple detected payment rows (≥2) classify the scan as a plan
 *     even when no schedule keyword is present (real Shop Pay screens
 *     don't say "Pay in 4" — they just list the rows).
 *   - A Gmail smart card ("Bill scheduled for payment") plus an email
 *     body that includes a real payment schedule classifies as a plan;
 *     the smart card alone (no schedule rows, no remaining balance)
 *     falls through to "unknown" so the iOS error surface tells the
 *     user to screenshot the full schedule.
 */
export function classifyPayLaterScan(input: PayLaterClassifyInput): PayLaterScanClassification {
  return classifyAndExtractPayLater(input).classification;
}

function classifyInternal(
  input: PayLaterClassifyInput,
  provider: { provider: PayLaterProviderRaw; displayName: string } | null,
  provisional: PayLaterScanObject | null
): PayLaterScanClassification {
  const text = (input.rawText ?? '').toLowerCase();

  if (input.scanPurpose === 'bill') return 'bill';

  const paymentRows = provisional?.payments ?? [];
  const futureRows = paymentRows.some((p) => p.status === 'scheduled' || p.status === 'overdue');
  const hasMultiplePayments = paymentRows.length >= 2;
  const hasRemainingBalance = provisional?.remainingBalance != null;

  // Confirmation pages carry "thank you / payment received" phrases AND
  // typically don't mention any future payments at all. A Pay Later
  // receipt that also lists upcoming installments must NOT be misread
  // as a confirmation — the extracted schedule overrules.
  const looksLikeConfirmation =
    containsAny(text, PAYMENT_CONFIRMATION_PHRASES) &&
    !containsAny(text, FUTURE_PAYMENT_PHRASES) &&
    !futureRows;
  if (looksLikeConfirmation) {
    return 'paymentConfirmation';
  }

  // payLaterPlan:
  //   • Provider + (schedule phrase OR ≥2 payment rows OR
  //     1 payment + remaining balance) → plan.
  //   • A provider keyword alone without ANY schedule evidence — e.g.
  //     a Gmail smart card that just says "Klarna · Bill scheduled for
  //     payment" — is NOT enough; that falls through to "unknown" so
  //     the user is asked to screenshot the actual schedule.
  if (provider) {
    if (containsAny(text, SCHEDULE_PHRASES) && paymentRows.length >= 1) {
      return 'payLaterPlan';
    }
    if (hasMultiplePayments) return 'payLaterPlan';
    if (paymentRows.length >= 1 && hasRemainingBalance) return 'payLaterPlan';
  }

  // Pay Later was requested explicitly but we couldn't pull a real plan.
  if (input.scanPurpose === 'payLater') {
    return 'unknown';
  }

  // Auto: fall back to bill if we have ANY bill signal, else unknown.
  if (
    input.vendorName !== null ||
    input.amountDue !== null ||
    input.dueDate !== null
  ) {
    return 'bill';
  }
  return 'unknown';
}

// MARK: - Field extractors

function extractInstallmentCount(text: string): number | null {
  // Common shapes: "pay in 4", "4 payments", "1 of 4", "payment 1 of 4".
  const patterns = [
    /pay\s*in\s*(\d{1,2})/i,
    /(\d{1,2})\s*(?:total|equal)?\s*payments/i,
    /\b\d{1,2}\s*of\s*(\d{1,2})\b/i,
    /payment\s*\d{1,2}\s*of\s*(\d{1,2})/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const n = Number(m[1]);
      if (n >= 2 && n <= 24) return n;
    }
  }
  return null;
}

function extractIntervalDays(text: string): number | null {
  if (/every\s*(?:two|2)\s*weeks?/i.test(text) || /\bbiweekly\b/i.test(text)) return 14;
  if (/\bweekly\b/i.test(text)) return 7;
  if (/\bmonthly\b/i.test(text) || /every\s*month\b/i.test(text)) return 30;
  return null;
}

function extractPaymentMethodLast4(text: string): string | null {
  // Common shapes:
  //   • "•••• 1234"        (Klarna / Affirm dot mask)
  //   • "ending in 1234"   (Bills / PayPal style)
  //   • "Visa 8197"        (Shop Pay status line: "Autopay • Visa 8197")
  //   • "Mastercard 1234"  (any card brand directly followed by 4 digits)
  //   • "card 1234"        (generic)
  const patterns = [
    /(?:•|\*|x){2,}\s*(\d{4})\b/i,
    /ending\s*(?:in\s*)?(\d{4})\b/i,
    /\b(?:visa|mastercard|master\s*card|amex|american\s*express|discover|debit|credit|card)\b[^\d]{0,12}(\d{4})\b/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[1];
  }
  return null;
}

/// Extracts a "remaining balance" the user can see on Shop Pay / Affirm
/// screens that often don't print the original purchase price. Tries the
/// most common phrasings: "Remaining $111.01", "$111.01 remaining",
/// "Remaining balance: $111.01", "$111.01 left".
function extractRemainingBalance(text: string): number | null {
  const patterns = [
    /remaining(?:\s*balance)?\s*[:\-]?\s*\$\s?([\d,]+(?:\.\d{1,2})?)/i,
    /\$\s?([\d,]+(?:\.\d{1,2})?)\s*(?:left|remaining)/i,
    /balance\s*remaining\s*[:\-]?\s*\$\s?([\d,]+(?:\.\d{1,2})?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const value = Number(m[1].replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

function extractIsAutopay(text: string): boolean | null {
  if (/\bautopay\b|\bauto[-\s]?pay\b|automatic\s*payments/i.test(text)) return true;
  return null;
}

function extractMerchantName(text: string, providerDisplayName: string): string | null {
  // Common shapes: "purchase at Nike", "from Best Buy", "Order at Target".
  // Case-insensitive throughout so a Capitalized "Purchase at" still
  // matches (case-sensitivity was the original bug here).
  const stripWords = (s: string) => s.trim().replace(/[.,;:!?]+$/g, '').trim();
  const patterns = [
    /purchase\s+(?:at|from)\s+([A-Z][\w&.\- ]{1,40})/i,
    /order\s+(?:at|from)\s+([A-Z][\w&.\- ]{1,40})/i,
    /\bfrom\s+([A-Z][\w&.\- ]{1,40})\s+(?:on|order)/i,
    /merchant\s*[:\-]\s*([A-Z][\w&.\- ]{1,40})/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const candidate = stripWords(m[1]);
      // Don't capture the provider's own brand name as the merchant.
      if (candidate && candidate.toLowerCase() !== providerDisplayName.toLowerCase()) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * Best-effort schedule extraction from raw OCR text. Walks the text
 * line-by-line and recognizes a wide range of real-world formats:
 *
 *   - "Payment 1: $55.00 - May 14"            (Klarna)
 *   - "1. $25.00 - May 14"                    (generic numbered)
 *   - "Paid: May 20, 2026 — $37.00"           (Shop Pay email)
 *   - "Autopay: Jun 4, 2026 — $37.00"         (Shop Pay email)
 *   - "May 19  $37.00 ✓"                      (Shop Pay screen row)
 *   - "$37.00 scheduled on June 4"            (Shop Pay status line)
 *   - "Next payment: $37 due Jun 4"           (generic)
 *
 * Any line with BOTH a recognizable month-day token AND a dollar
 * amount becomes a payment row. Status is derived from inline hints
 * (paid / completed / received / ✓ → paid; autopay / scheduled / due
 * → scheduled). Rows are deduplicated on (date, amount) so multi-pass
 * OCR text that surfaces the same line twice doesn't produce two
 * payments for the same installment.
 */
function extractPayments(
  text: string,
  resolvedDueDate: string | null,
  resolvedAmount: number | null
): PayLaterExtractedPayment[] {
  const lines = text.split(/\r?\n/);
  type Collected = { dueDate: string | null; amount: number; status: PayLaterPaymentStatus; sortKey: number };
  const collected: Collected[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (!hasPaymentLineSignal(line)) continue;

    // Date can appear before OR after the amount on the same line.
    const dateString = parseMonthDay(line);
    const amountMatch = line.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
    if (!dateString || !amountMatch) continue;

    const amount = Number(amountMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) continue;

    collected.push({
      dueDate: dateString,
      amount,
      status: paymentStatusFromLine(line),
      sortKey: new Date(`${dateString}T00:00:00`).getTime(),
    });
  }

  if (collected.length > 0) {
    // Deduplicate on (date, amount) and sort chronologically so the
    // sequence number always matches calendar order.
    const seen = new Set<string>();
    const unique: Collected[] = [];
    for (const c of collected) {
      const key = `${c.dueDate}|${c.amount.toFixed(2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }
    unique.sort((a, b) => a.sortKey - b.sortKey);
    return unique.map((p, i) => ({
      sequenceNumber: i + 1,
      dueDate: p.dueDate,
      amount: p.amount,
      status: p.status,
    }));
  }

  // Fallback: "next payment $X due Mon DD" — common in summary lines
  // when the schedule rows aren't included in OCR text.
  const next = text.match(/next\s*payment[^\$]*\$([\d,]+(?:\.\d{1,2})?)(?:[^A-Za-z]*([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?))?/i);
  if (next) {
    const amount = Number(next[1].replace(/,/g, ''));
    return [{
      sequenceNumber: 1,
      dueDate: next[2] ? normalizeMonthDay(next[2]) : resolvedDueDate,
      amount: Number.isFinite(amount) ? amount : null,
      status: 'scheduled',
    }];
  }

  // Phase 12: deliberately do NOT fabricate a phantom payment from the
  // v1 bill ranker's amount/date here. The classifier uses "≥1 real
  // payment row" as evidence the scan is a Pay Later plan — a
  // synthesized payment would misclassify confirmation pages and
  // generic bills as plans.
  return [];
}

/// True when the line plausibly describes an installment payment —
/// must contain a dollar sign OR one of the payment-row keywords. Used
/// to keep generic prose lines ("YoungLA has processed your order")
/// from getting picked up as payments.
function hasPaymentLineSignal(line: string): boolean {
  return /\$/.test(line) || /\b(paid|autopay|scheduled|payment|installment|due)\b/i.test(line);
}

/// Status derived from inline hints. "Paid" / "Completed" / "Received"
/// / ✓ / ✔ → paid. Everything else stays `.scheduled` (the route's
/// past-due flipper later promotes a stale scheduled row to overdue).
function paymentStatusFromLine(line: string): PayLaterPaymentStatus {
  const lower = line.toLowerCase();
  if (/\b(paid|completed|received)\b/.test(lower) || /✓|✔/.test(line)) {
    return 'paid';
  }
  return 'scheduled';
}

/// Finds the first Mon-DD (or Mon DD, YYYY) token anywhere in the line
/// and converts it to YYYY-MM-DD. Anchored to KNOWN month names so we
/// don't mistake "Payment 1" or "Card 1234" for a date. Permissive
/// about casing / trailing period / abbreviated vs. full names
/// ("Jan", "January", "Sept").
function parseMonthDay(line: string): string | null {
  const m = line.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,\s*(\d{4}))?\b/i);
  if (!m) return null;
  return normalizeMonthDay(`${m[1]} ${m[2]}${m[3] ? ', ' + m[3] : ''}`);
}

/**
 * Converts "May 14" / "May 14, 2026" / "Sept 9" into "YYYY-MM-DD".
 * Defaults to the current year when the year is missing. Local
 * timezone — matches the Duezo date-only convention.
 */
function normalizeMonthDay(value: string): string | null {
  const months: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };
  const cleaned = value.trim().toLowerCase().replace(/\.+$/, '');
  const m = cleaned.match(/^([a-z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) return null;
  const month = months[m[1]] ?? months[m[1].slice(0, 4)] ?? months[m[1].slice(0, 3)];
  if (!month) return null;
  const day = Number(m[2]);
  if (!day || day < 1 || day > 31) return null;
  const year = m[3] ? Number(m[3]) : new Date().getFullYear();
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// MARK: - Build Pay Later object

function buildPayLaterObject(
  input: PayLaterClassifyInput,
  provider: { provider: PayLaterProviderRaw; displayName: string }
): PayLaterScanObject {
  const text = input.rawText ?? '';
  const lower = text.toLowerCase();

  // Merchant name: prefer an explicit "Purchase at X" / "from X" phrase
  // in the text. Fall back to the v1 ranker's vendorName when the text
  // doesn't carry the preposition (common on Shop Pay screens where
  // the merchant just appears on its own line) — but only when the
  // ranker's value isn't the provider's own brand name.
  const merchantName =
    extractMerchantName(text, provider.displayName) ??
    cleanedNonProviderVendor(input.vendorName, provider.displayName);
  const paymentMethodLast4 = extractPaymentMethodLast4(text);
  const isAutopay = extractIsAutopay(text);
  const payments = extractPayments(text, input.dueDate, input.amountDue);
  const remainingBalance = extractRemainingBalance(text);

  // installmentCount: prefer the count of extracted payment rows when
  // we have a real schedule (it's the most accurate signal). Fall back
  // to the text hint ("Pay in 4", "4 payments") when the schedule was
  // partial or empty.
  const countFromText = extractInstallmentCount(lower);
  const installmentCount =
    payments.length >= 2 ? payments.length : countFromText;

  // intervalDays: prefer the text hint ("biweekly", "every two weeks").
  // Fall back to deriving it from the first two extracted payments —
  // Shop Pay rarely uses the word "biweekly", but its rows are reliably
  // 14 days apart.
  const intervalFromText = extractIntervalDays(lower);
  const intervalDays = intervalFromText ?? intervalFromPayments(payments);

  // originalAmount: Shop Pay screens often only show "Remaining $X" and
  // never the original purchase price. If the v1 ranker didn't pull
  // an amount AND the schedule has explicit amounts, sum them — this
  // is the financed total the plan was built on.
  const paymentsSum = sumKnownAmounts(payments);
  const originalAmount =
    input.amountDue ??
    (paymentsSum != null && paymentsSum > 0 ? round2(paymentsSum) : null);

  // If the first payment is mentioned as already paid, mark it. Use a
  // permissive line-level match — anything on the same line as
  // "Payment 1" mentioning paid/completed/received counts. (The
  // per-line status detector already handles "Paid:" / "✓" rows.)
  if (payments.length > 0 && /payment\s*1\b[^\n]*(?:paid|completed|received)/i.test(lower)) {
    payments[0].status = 'paid';
  }
  // Pre-mark any payment whose due date is in the past as overdue.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const p of payments) {
    if (p.status !== 'scheduled' || !p.dueDate) continue;
    const due = new Date(`${p.dueDate}T00:00:00`);
    if (due.getTime() < today.getTime()) {
      p.status = 'overdue';
    }
  }

  // Confidence: more signals → higher.
  let signals = 0;
  if (merchantName) signals += 1;
  if (installmentCount) signals += 1;
  if (intervalDays) signals += 1;
  if (payments.length > 1) signals += 1;
  if (originalAmount !== null) signals += 1;
  if (remainingBalance !== null) signals += 1;
  const extractionConfidence: PayLaterExtractionConfidence =
    signals >= 4 ? 'high' : signals >= 2 ? 'medium' : 'low';

  // Required-fields gate per Phase 12 requirements: a draft is good
  // enough when we have a merchant or provider display name, AND
  // (≥2 payment rows OR 1 next payment + remaining balance), AND at
  // least one amount, AND at least one due date. Below that bar we
  // ask the user to review.
  const hasMerchantOrProvider = !!(merchantName || provider.displayName);
  const hasEnoughPayments =
    payments.length >= 2 || (payments.length >= 1 && remainingBalance !== null);
  const hasAnyAmount =
    originalAmount !== null ||
    remainingBalance !== null ||
    payments.some((p) => p.amount !== null);
  const hasAnyDueDate = payments.some((p) => p.dueDate !== null) || input.dueDate !== null;

  const meetsBar = hasMerchantOrProvider && hasEnoughPayments && hasAnyAmount && hasAnyDueDate;
  const reviewNeeded = !meetsBar || extractionConfidence === 'low';
  const reviewReason = reviewNeeded
    ? buildReviewReason({ hasMerchantOrProvider, hasEnoughPayments, hasAnyAmount, hasAnyDueDate, extractionConfidence })
    : null;

  return {
    provider: provider.provider,
    providerDisplayName: provider.displayName,
    merchantName,
    purchaseTitle: null,
    orderIdentifier: null,
    originalAmount,
    financedAmount: null,
    downPayment: null,
    remainingBalance,
    currency: 'USD',
    planType: installmentCount === 4 && (intervalDays === 14 || intervalDays === null) ? 'pay_in_4' : null,
    installmentCount,
    intervalDays,
    apr: null,
    interestAmount: null,
    feeAmount: null,
    paymentMethodLast4,
    isAutopay,
    payments,
    rawVisibleText: input.rawText,
    extractionConfidence,
    reviewNeeded,
    reviewReason,
  };
}

function cleanedNonProviderVendor(vendor: string | null, providerDisplay: string): string | null {
  if (!vendor) return null;
  const trimmed = vendor.trim();
  if (trimmed.length === 0) return null;
  // Skip when the v1 ranker just picked up the provider's brand as the
  // vendor (e.g. vendorName === "Klarna"). Compare loosely so "Shop Pay"
  // doesn't accidentally pass through as a merchant.
  const lowered = trimmed.toLowerCase();
  const providerLowered = providerDisplay.toLowerCase();
  if (lowered === providerLowered) return null;
  if (providerLowered.includes(lowered) || lowered.includes(providerLowered)) return null;
  // Block obvious BNPL-only phrases too.
  if (/^(shop\s*pay|klarna|affirm|afterpay|sezzle|zip|paypal)/i.test(trimmed)) return null;
  return trimmed;
}

function intervalFromPayments(payments: PayLaterExtractedPayment[]): number | null {
  const dates = payments
    .map((p) => p.dueDate)
    .filter((d): d is string => typeof d === 'string')
    .map((d) => new Date(`${d}T00:00:00`).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  if (dates.length < 2) return null;
  const gap = Math.round((dates[1] - dates[0]) / 86400000);
  return gap > 0 && gap <= 60 ? gap : null;
}

function sumKnownAmounts(payments: PayLaterExtractedPayment[]): number | null {
  const amounts = payments.map((p) => p.amount).filter((a): a is number => typeof a === 'number');
  if (amounts.length === 0) return null;
  return amounts.reduce((acc, n) => acc + n, 0);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildReviewReason(parts: {
  hasMerchantOrProvider: boolean;
  hasEnoughPayments: boolean;
  hasAnyAmount: boolean;
  hasAnyDueDate: boolean;
  extractionConfidence: PayLaterExtractionConfidence;
}): string {
  const missing: string[] = [];
  if (!parts.hasMerchantOrProvider) missing.push('merchant');
  if (!parts.hasEnoughPayments) missing.push('schedule');
  if (!parts.hasAnyAmount) missing.push('amount');
  if (!parts.hasAnyDueDate) missing.push('due dates');
  if (missing.length === 0 && parts.extractionConfidence === 'low') {
    return 'Low overall confidence';
  }
  return `Missing or low-confidence: ${missing.join(', ') || 'overall extraction'}`;
}

// MARK: - Public entry point

/**
 * One-call entry point used by the scan route. Returns the
 * classification + (when applicable) the Pay Later object.
 *
 * scanPurpose semantics:
 *   - "bill"     → always returns { classification: "bill", payLater: null }
 *   - "payLater" → classification is "payLaterPlan" / "paymentConfirmation"
 *                  / "unknown"; payLater is filled only on payLaterPlan
 *   - "auto"     → caller doesn't care; the post-processor picks the best
 *                  fit (defaults to "bill" when bill signals are present
 *                  and nothing Pay Later was detected)
 */
export function classifyAndExtractPayLater(input: PayLaterClassifyInput): PayLaterClassifyOutput {
  if (input.scanPurpose === 'bill') {
    return { classification: 'bill', payLater: null };
  }

  // Build the provisional object FIRST — the classifier needs to know
  // how many payment rows we managed to extract (Phase 12: multiple
  // extracted rows alone qualify a scan as a plan).
  const provider = normalizePayLaterProvider(input.rawText, input.vendorName);
  const provisional = provider ? buildPayLaterObject(input, provider) : null;

  const classification = classifyInternal(input, provider, provisional);
  if (classification !== 'payLaterPlan') {
    return { classification, payLater: null };
  }

  // If the classifier decided this is a plan but no provider was
  // matched, fall back to a generic "Pay Later" so the iOS draft still
  // has something to render.
  if (!provisional) {
    const fallback = { provider: 'other' as PayLaterProviderRaw, displayName: 'Pay Later' };
    return { classification, payLater: buildPayLaterObject(input, fallback) };
  }
  return { classification, payLater: provisional };
}

/**
 * Returns true when the caller opted into the v3 response shape via
 * `?v=3` on the URL or `responseVersion: 3` (also accepts string "3"
 * and snake_case `response_version`) in the JSON body. v2 (and v1)
 * remain available for every existing client.
 */
export function wantsV3Response(requestUrl: string, body: unknown): boolean {
  try {
    const v = new URL(requestUrl).searchParams.get('v');
    if (v === '3') return true;
  } catch {
    // Non-absolute URL — fall through to body check.
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const candidate = record.responseVersion ?? record.response_version;
    if (candidate === 3 || candidate === '3') return true;
  }
  return false;
}

/**
 * Reads the `scanPurpose` field from the request body. Defaults to
 * "bill" so existing v1/v2 callers (which don't set it) keep the bills
 * behavior verbatim.
 */
export function parseScanPurpose(body: unknown): PayLaterScanPurpose {
  if (body && typeof body === 'object') {
    const raw = (body as Record<string, unknown>).scanPurpose;
    if (raw === 'payLater' || raw === 'auto' || raw === 'bill') return raw;
  }
  return 'bill';
}
