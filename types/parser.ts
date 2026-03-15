import type { BillCategory, RecurrenceInterval } from '@/types';

export type Provider = 'gmail' | 'yahoo' | 'outlook' | 'imap' | 'other';

export type EmailType =
  | 'bill_due'
  | 'statement_ready'
  | 'autopay_notice'
  | 'payment_confirmation'
  | 'subscription_renewal'
  | 'receipt'
  | 'promo'
  | 'other';

export interface NormalizedEmail {
  id: string;
  userId: string;
  provider: Provider;
  providerMessageId: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  senderDomain: string | null;
  receivedAt: string;
  headers: Record<string, string>;
  bodyPlain: string;
  bodyHtml?: string | null;
  bodyText: string;
  bodyHash: string;
  domFingerprint: string;
  textFingerprint: string;
  subjectShape: string;
}

export interface FieldEvidence {
  field: keyof ParsedBillFields | string;
  source: 'subject' | 'from' | 'body' | 'header' | 'template' | 'ai' | 'postprocess' | 'system';
  matcherType?: MatcherType;
  extractorType?: ExtractorType;
  snippet?: string;
  value?: string | number | boolean | null;
  start?: number;
  end?: number;
  details?: Record<string, unknown>;
}

export interface ParsedBillFields {
  name?: string | null;
  amount?: number | null;
  due_date?: string | null;
  category?: BillCategory | null;
  is_recurring?: boolean | null;
  recurrence_interval?: RecurrenceInterval | null;
  account_last4?: string | null;
}

export type FieldConfidence = Partial<Record<keyof ParsedBillFields, number>>;

export type ParseDecision = 'accept' | 'ai_verify' | 'review' | 'rejected';
export type ReconciliationDecision = 'insert' | 'update' | 'skip' | 'review';

export type ReviewReason =
  | 'duplicate_uncertain'
  | 'low_confidence'
  | 'ai_disagreement'
  | 'missing_amount'
  | 'missing_due_date'
  | 'vendor_mismatch';

export interface ReconciliationResult {
  decision: ReconciliationDecision;
  confidence: number;
  matchedBillId?: string | null;
  reviewReason?: ReviewReason | null;
  appliedFields?: ParsedBillFields;
  details?: Record<string, unknown>;
}

export interface AiVerificationResult {
  accepted: boolean;
  confidence: number;
  fields: ParsedBillFields;
  corrections: Partial<ParsedBillFields>;
  disagreements: Array<keyof ParsedBillFields | string>;
  evidence: FieldEvidence[];
  rawResponse: Record<string, unknown> | null;
}

export interface ParseRunResult {
  accepted: boolean;
  decision: ParseDecision;
  mode: 'deterministic' | 'ai_verify' | 'ai_extract' | 'legacy_fallback';
  createdBillId?: string | null;
  parseRunId?: string | null;
  matchedBillId?: string | null;
  reason?: string;
  emailType: EmailType;
  classifierConfidence: number;
  vendorId?: string | null;
  vendorConfidence?: number;
  templateId?: string | null;
  templateConfidence?: number;
  overallConfidence?: number;
  actionConfidence?: number;
  aiUsed: boolean;
  parsedFields: ParsedBillFields;
  fieldConfidence: FieldConfidence;
  evidence: FieldEvidence[];
  rawAiOutput?: Record<string, unknown> | null;
  reviewReason?: ReviewReason | null;
  reconciliation?: ReconciliationResult;
  fallbackResult?: unknown;
}

export type MatcherType =
  | 'domain_regex'
  | 'email_regex'
  | 'display_name_regex'
  | 'regex'
  | 'contains'
  | 'header_equals'
  | 'header_regex'
  | 'dom_fingerprint_prefix';

export interface BaseMatcher {
  type: MatcherType;
  pattern?: string;
  value?: string;
  header?: string;
  weight?: number;
  required?: boolean;
  negative?: boolean;
  flags?: string;
}

export interface MatcherConfig {
  from?: BaseMatcher[];
  subject?: BaseMatcher[];
  body?: BaseMatcher[];
  headers?: BaseMatcher[];
}

export type ExtractorType = 'constant' | 'regex' | 'label_proximity';

export interface BaseExtractor {
  type: ExtractorType;
  priority?: number;
  value?: string | number | boolean | null;
  pattern?: string;
  flags?: string;
  group?: number | string;
  label?: string;
  window?: number;
  transforms?: string[];
  confidence?: number;
}

export type ExtractorConfig = Partial<Record<keyof ParsedBillFields, BaseExtractor[]>>;

export interface ConfidenceRule {
  type:
    | 'from_match'
    | 'subject_match'
    | 'body_anchor'
    | 'fields_extracted'
    | 'negative_match'
    | 'multiple_currency_candidates'
    | 'multiple_date_candidates'
    | 'vendor_resolved';
  weight: number;
  field?: keyof ParsedBillFields;
  minCount?: number;
}

export interface ConfidenceConfig {
  acceptThreshold?: number;
  aiVerifyThreshold?: number;
  baseScore?: number;
  rules?: ConfidenceRule[];
}

export interface DriftConfig {
  maxNullRate?: number;
  maxCorrectionRate?: number;
  maxAiFallbackRate?: number;
  disableAfterFailures?: number;
}

export interface VendorTemplate {
  id: string;
  vendor_id: string;
  template_key: string;
  version: number;
  status: 'candidate' | 'active' | 'disabled' | 'archived';
  scope: 'global' | 'local';
  owner_user_id: string | null;
  email_type: EmailType;
  source: 'manual' | 'learned' | 'imported';
  matcher_config: MatcherConfig;
  extractor_config: ExtractorConfig;
  postprocess_config: Record<string, unknown>;
  confidence_config: ConfidenceConfig;
  drift_config: DriftConfig;
  precision_score: number | null;
  recall_score: number | null;
  eval_sample_size: number;
  created_at: string;
  updated_at: string;
}

export interface MatchEvaluationResult {
  matched: boolean;
  score: number;
  maxScore: number;
  normalizedScore: number;
  negativeMatched: boolean;
  signals: FieldEvidence[];
}

export interface ExtractorCandidate {
  extractorType: ExtractorType;
  rawValue: string | number | boolean | null;
  value: string | number | boolean | null;
  confidence: number;
  evidence: FieldEvidence | null;
}

export interface ExtractorRunResult {
  matched: boolean;
  value: string | number | boolean | null;
  confidence: number;
  evidence: FieldEvidence | null;
  candidates: ExtractorCandidate[];
}

export interface TemplateExecutionResult {
  matched: boolean;
  templateId: string;
  templateKey: string;
  templateVersion: number;
  vendorId: string;
  emailType: EmailType;
  matcher: MatchEvaluationResult;
  fields: ParsedBillFields;
  fieldConfidence: FieldConfidence;
  evidence: FieldEvidence[];
  overallConfidence: number;
}
