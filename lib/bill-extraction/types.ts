/**
 * TypeScript interfaces for the Bill Extraction Engine
 */

import { BillCategory } from '@/types';

// ============================================================================
// Raw Email Types
// ============================================================================

export interface RawEmail {
  id: string;
  user_id: string;
  gmail_message_id: string;
  subject: string;
  from_address: string;
  date_received: string;
  body_plain: string | null;
  body_html: string | null;
  body_cleaned: string | null;
  attachments: EmailAttachment[];
  processed_at: string | null;
  created_at: string;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

// ============================================================================
// Candidate Extraction Types
// ============================================================================

export interface AmountCandidate {
  value: number;
  context: string;       // ~80 chars around match
  keywordScore: number;  // +3 for "amount due", -3 for "refund"
  isMinimum: boolean;    // True if this is a minimum payment amount
  hasDecimals: boolean;
  patternType: 'total' | 'minimum' | 'general';
}

export interface DateCandidate {
  value: string;         // YYYY-MM-DD format
  context: string;       // ~80 chars around match
  keywordScore: number;  // Score based on nearby keywords
  patternPriority: number; // Lower = higher priority (based on pattern order)
  isRelative: boolean;   // True if parsed from "due in X days"
}

export interface NameCandidate {
  value: string;
  source: 'sender' | 'subject' | 'body' | 'product_refinement';
  confidence: number;
  category?: BillCategory;
}

// ============================================================================
// Extraction Result Types
// ============================================================================

export interface CandidateExtractionResult {
  amounts: AmountCandidate[];
  dates: DateCandidate[];
  names: NameCandidate[];
  keywordScore: number;        // Overall bill-likelihood score
  matchedKeywords: string[];
  isPromotional: boolean;
  skipReason: string | null;
}

export interface EvidenceSnippet {
  field: 'name' | 'amount' | 'due_date' | 'category';
  snippet: string;
  source: 'email_subject' | 'email_body' | 'sender' | 'ai_extraction';
}

// ============================================================================
// AI Extraction Types
// ============================================================================

export interface AIExtractionRequest {
  emailId: string;
  subject: string;
  from: string;
  cleanedBody: string;
  candidateAmounts: AmountCandidate[];
  candidateDates: DateCandidate[];
  candidateNames: NameCandidate[];
}

export interface AIExtractionResult {
  isBill: boolean;
  name: string | null;
  amount: number | null;
  dueDate: string | null;
  category: BillCategory | null;
  evidence: EvidenceSnippet[];
  confidence: {
    overall: number;
    name: number;
    amount: number;
    dueDate: number;
  };
  reasoning: string;
  tokensUsed?: number;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  adjustedConfidence: {
    overall: number;
    name: number;
    amount: number;
    dueDate: number;
  };
  warnings: string[];
  errors: string[];
  isDuplicate: boolean;
  duplicateBillId?: string;
  duplicateReason?: string;
}

// ============================================================================
// Bill Extraction (Database Record)
// ============================================================================

export type ExtractionStatus =
  | 'pending'
  | 'needs_review'
  | 'confirmed'
  | 'rejected'
  | 'auto_accepted';

export interface BillExtraction {
  id: string;
  user_id: string;
  email_raw_id: string | null;

  // Status
  status: ExtractionStatus;

  // Extracted data
  extracted_name: string | null;
  extracted_amount: number | null;
  extracted_due_date: string | null;
  extracted_category: BillCategory | null;

  // Confidence scores
  confidence_overall: number | null;
  confidence_amount: number | null;
  confidence_due_date: number | null;
  confidence_name: number | null;

  // Evidence
  evidence_snippets: EvidenceSnippet[];
  candidate_amounts: AmountCandidate[];
  candidate_dates: DateCandidate[];

  // AI metadata
  ai_model_used: string | null;
  ai_raw_response: string | null;
  ai_tokens_used: number | null;

  // Duplicate detection
  is_duplicate: boolean;
  duplicate_of_bill_id: string | null;
  duplicate_reason: string | null;

  // User corrections
  user_corrected_name: string | null;
  user_corrected_amount: number | null;
  user_corrected_due_date: string | null;
  user_corrected_category: BillCategory | null;
  reviewed_at: string | null;
  reviewed_by: string | null;

  // Created bill
  created_bill_id: string | null;

  // Payment link extraction
  payment_url: string | null;
  payment_confidence: number | null;
  payment_evidence: PaymentLinkEvidence | null;
  candidate_payment_links: PaymentLinkCandidate[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Pipeline Types
// ============================================================================

export interface ExtractionPipelineResult {
  success: boolean;
  emailId: string;
  gmailMessageId: string;
  extraction: BillExtraction | null;
  route: 'auto_accept' | 'needs_review' | 'rejected';
  error?: string;
}

export interface ProcessEmailOptions {
  userId: string;
  email: {
    gmail_message_id: string;
    subject: string;
    from: string;
    date: string;
    body_plain?: string;
    body_html?: string;
    attachments?: EmailAttachment[];
  };
  existingBillIds?: string[];
  skipAI?: boolean;
  forceReprocess?: boolean;
}

// ============================================================================
// Batch Processing Types
// ============================================================================

export interface BatchScanResult {
  totalEmails: number;
  processed: number;
  skipped: number;
  errors: number;
  autoAccepted: number;
  needsReview: number;
  rejected: number;
  results: ExtractionPipelineResult[];
}

// ============================================================================
// Review Queue Types
// ============================================================================

export interface ReviewQueueItem {
  id: string;
  email_subject: string;
  email_from: string;
  email_date: string;
  extracted_name: string | null;
  extracted_amount: number | null;
  extracted_due_date: string | null;
  extracted_category: BillCategory | null;
  confidence_overall: number | null;
  confidence_amount: number | null;
  confidence_due_date: number | null;
  evidence_snippets: EvidenceSnippet[];
  is_duplicate: boolean;
  duplicate_reason: string | null;
  created_at: string;
}

export interface ReviewAction {
  action: 'confirm' | 'reject' | 'edit';
  corrections?: {
    name?: string;
    amount?: number;
    due_date?: string;
    category?: BillCategory;
  };
}

// ============================================================================
// Payment Link Extraction Types
// ============================================================================

export interface PaymentLinkCandidate {
  url: string;
  anchorText: string;
  score: number;
  domain: string;
  context: string;         // ~80 chars around the link
  position: number;        // Order in which link appears in email
}

export interface PaymentLinkExtractionResult {
  candidates: PaymentLinkCandidate[];
  skipReason: string | null;
}

export interface AIPaymentLinkRequest {
  vendorName: string | null;
  fromDomain: string;
  subject: string;
  candidates: PaymentLinkCandidate[];
}

export interface AIPaymentLinkResult {
  paymentUrl: string | null;
  confidence: number;
  evidence: string;
  reasoning: string;
}

export interface PaymentLinkValidationResult {
  isValid: boolean;
  url: string | null;
  errors: string[];
  warnings: string[];
  finalDomain: string | null;
}

export interface PaymentLinkPipelineResult {
  url: string | null;
  confidence: number;
  evidence: PaymentLinkEvidence | null;
  candidates: PaymentLinkCandidate[];
}

export interface PaymentLinkEvidence {
  selectedUrl: string;
  anchorText: string;
  aiReasoning: string;
  validationPassed: boolean;
}
