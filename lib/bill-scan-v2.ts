/**
 * Bill Scan v2 response schema.
 *
 * Phase 1 (this file): define the v2 response *type* and a pure mapper
 * that builds it from values the existing `/api/bills/scan` route has
 * already computed. The route attaches the result under a `v2` key
 * ONLY when the caller opts in (`responseVersion: 2` in the body or
 * `?v=2` in the query) — the legacy v1 body is never altered.
 *
 * Field set is the Phase 1 list agreed for the v2 schema. Fields the
 * pipeline does not yet extract (subject/sender/body text, vendor
 * brand normalization, account type, minimum due, payment
 * confirmation, etc.) are present in the type and default to `null`
 * here. They are populated in a later phase when the prompt + a
 * deterministic post-processor land — this file intentionally does
 * NOT classify anything.
 *
 * NOTE / contract conflict to resolve later: the iOS spec at
 * `docs/bill-scan-v2-spec.md` (and the already-shipped iOS
 * `BillScanIdentityHints` decoder) expect a snake_case `identity`
 * object (`raw_ocr_text`, `subject_text`, `detected_account_type`,
 * …). This Phase 1 schema uses the camelCase field list requested for
 * the backend task and is emitted under `v2`. The two naming schemes
 * must be reconciled before the iOS client is pointed at v2.
 */

// Enum string unions mirror the iOS spec §4 raw values so the eventual
// client mapping is a direct decode.
export type V2AccountType =
  | 'autoLoan'
  | 'creditCard'
  | 'mortgage'
  | 'wireless'
  | 'internet'
  | 'electric'
  | 'gas'
  | 'water'
  | 'insurance'
  | 'streaming'
  | 'rent'
  | 'subscription'
  | 'other';

export type V2ServiceCategory =
  | 'loan'
  | 'creditCard'
  | 'mortgage'
  | 'utility'
  | 'telecom'
  | 'insurance'
  | 'streaming'
  | 'housing'
  | 'other';

export type V2PaymentStatus =
  | 'unknown'
  | 'statementReady'
  | 'paymentScheduled'
  | 'paymentReceived'
  | 'overdue'
  | 'minimumDue';

export type V2SourceDocumentType =
  | 'scan'
  | 'photo'
  | 'emailScreenshot'
  | 'manual'
  | 'unknown';

/**
 * Strength of evidence that the resolved vendor/account identity is
 * correct. Distinct from the numeric extraction `confidence` (which is
 * about the amount/due-date/vendor OCR). Set deterministically by the
 * Phase 3 post-processor: high when brand + account type both come from
 * subject/body text, low for a vendor-only Gmail smart-card match.
 */
export type V2IdentityConfidence =
  | 'unknown'
  | 'low'
  | 'medium'
  | 'strong'
  | 'high';

/** The capture channel the iOS client reports on the scan request. */
export type ScanSourceType =
  | 'camera'
  | 'photo_library'
  | 'document_scanner'
  | 'quick_add';

export interface BillScanV2FieldConfidence {
  vendorName: number | null;
  amountDue: number | null;
  dueDate: number | null;
}

export interface BillScanV2Evidence {
  vendorText: string | null;
  amountText: string | null;
  dueDateText: string | null;
  rawText: string | null;
}

export interface BillScanV2 {
  scanSessionId: string;

  // Raw text streams (not yet extracted server-side — Phase 2).
  rawVisibleText: string | null;
  detectedSubjectText: string | null;
  detectedSenderName: string | null;
  detectedSenderDomain: string | null;
  detectedSmartCardText: string | null;
  detectedBodyText: string | null;

  // Vendor identity.
  vendorRawName: string | null;
  vendorBrand: string | null;
  vendorLegalName: string | null;
  billDisplayName: string | null;

  // Account classification (Phase 2 post-processor populates these).
  accountType: V2AccountType | null;
  serviceCategory: V2ServiceCategory | null;

  // Amounts.
  amountDue: number | null;
  minimumDue: number | null;
  statementBalance: number | null;
  dueDate: string | null;

  // Payment-confirmation fields (Phase 2).
  paymentAmount: number | null;
  paymentDate: string | null;
  paymentStatus: V2PaymentStatus | null;

  // Document classification.
  documentType: string | null;
  sourceDocumentType: V2SourceDocumentType | null;
  isBill: boolean;
  isPaymentConfirmation: boolean | null;

  // Confidence + evidence. `confidence` (+ fieldConfidence) is the
  // numeric extraction confidence; `identityConfidence` is the
  // separate enum strength of the vendor/account-type identity.
  confidence: number | null;
  fieldConfidence: BillScanV2FieldConfidence;
  identityConfidence: V2IdentityConfidence | null;
  evidence: BillScanV2Evidence;

  // Review.
  reviewNeeded: boolean;
  reviewReason: string | null;
  warnings: string[];
}

/**
 * Maps the capture channel reported on the scan request to the v2
 * `sourceDocumentType` enum. Deterministic and total — not part of the
 * (deferred) identity post-processor.
 */
export function mapSourceDocumentType(sourceType: ScanSourceType | string | null): V2SourceDocumentType {
  switch (sourceType) {
    case 'camera':
    case 'document_scanner':
      return 'scan';
    case 'photo_library':
      return 'photo';
    case 'quick_add':
      return 'manual';
    default:
      return 'unknown';
  }
}

/**
 * Inputs the route already has in scope after running the existing
 * ranker. The builder does no extraction or classification of its
 * own — it only shapes already-resolved values into the v2 schema and
 * sets not-yet-extracted fields to null.
 */
export interface BuildBillScanV2Input {
  scanSessionId: string;
  vendorRawName: string | null;
  amountDue: number | null;
  dueDate: string | null;
  documentType: string | null;
  isBill: boolean;
  sourceType: ScanSourceType | string | null;
  rawVisibleText: string | null;
  overallConfidence: number | null;
  fieldConfidence: BillScanV2FieldConfidence;
  evidence: BillScanV2Evidence;
  reviewNeeded: boolean;
  reviewReason: string | null;
  warnings: string[];
}

export function buildBillScanV2(input: BuildBillScanV2Input): BillScanV2 {
  return {
    scanSessionId: input.scanSessionId,

    rawVisibleText: input.rawVisibleText,
    detectedSubjectText: null,
    detectedSenderName: null,
    detectedSenderDomain: null,
    detectedSmartCardText: null,
    detectedBodyText: null,

    vendorRawName: input.vendorRawName,
    vendorBrand: null,
    vendorLegalName: null,
    billDisplayName: null,

    accountType: null,
    serviceCategory: null,

    amountDue: input.amountDue,
    minimumDue: null,
    statementBalance: null,
    dueDate: input.dueDate,

    paymentAmount: null,
    paymentDate: null,
    paymentStatus: null,

    documentType: input.documentType,
    sourceDocumentType: mapSourceDocumentType(input.sourceType),
    isBill: input.isBill,
    isPaymentConfirmation: null,

    confidence: input.overallConfidence,
    fieldConfidence: input.fieldConfidence,
    identityConfidence: null,
    evidence: input.evidence,

    reviewNeeded: input.reviewNeeded,
    reviewReason: input.reviewReason,
    warnings: input.warnings,
  };
}

/**
 * Returns true when the caller opted into the v2 response shape, via
 * either `?v=2` on the URL or `responseVersion: 2` (also accepts the
 * snake_case `response_version`, and the string "2") in the JSON body.
 * v1 remains the default for every existing client.
 */
export function wantsV2Response(requestUrl: string, body: unknown): boolean {
  try {
    const v = new URL(requestUrl).searchParams.get('v');
    if (v === '2') return true;
  } catch {
    // Non-absolute URL — fall through to body check.
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const candidate = record.responseVersion ?? record.response_version;
    if (candidate === 2 || candidate === '2') return true;
  }
  return false;
}
