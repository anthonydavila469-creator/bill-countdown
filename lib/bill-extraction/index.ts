/**
 * Bill Extraction Engine
 *
 * A production-grade pipeline for extracting bill information from emails
 * combining deterministic parsing, Claude AI, and validation.
 *
 * Pipeline stages:
 * 1. Preprocess - Clean HTML, remove footers
 * 2. Extract Candidates - Regex extraction with keyword scoring
 * 3. Claude AI - Classify and extract with evidence
 * 4. Validate - Check amounts, dates, duplicates
 * 5. Route - Auto-accept, needs review, or reject
 */

// Types
export type {
  RawEmail,
  EmailAttachment,
  AmountCandidate,
  DateCandidate,
  NameCandidate,
  CandidateExtractionResult,
  EvidenceSnippet,
  AIExtractionRequest,
  AIExtractionResult,
  ValidationResult,
  ExtractionStatus,
  BillExtraction,
  ExtractionPipelineResult,
  ProcessEmailOptions,
  BatchScanResult,
  ReviewQueueItem,
  ReviewAction,
  // Payment link types
  PaymentLinkCandidate,
  PaymentLinkExtractionResult,
  AIPaymentLinkRequest,
  AIPaymentLinkResult,
  PaymentLinkValidationResult,
  PaymentLinkPipelineResult,
  PaymentLinkEvidence,
} from './types';

// Constants
export {
  PROMOTIONAL_KEYWORDS,
  SKIP_KEYWORDS,
  BILL_KEYWORDS,
  AMOUNT_KEYWORD_SCORES,
  DATE_KEYWORD_SCORES,
  SENDER_PATTERNS,
  PRODUCT_REFINEMENT_PATTERNS,
  TOTAL_AMOUNT_PATTERNS,
  MINIMUM_AMOUNT_PATTERNS,
  GENERAL_AMOUNT_PATTERNS,
  DATE_PATTERNS,
  VALIDATION,
  CONFIDENCE_WEIGHTS,
  AI_CONFIG,
  // Payment link constants
  PAYMENT_LINK_KEYWORDS,
  PAYMENT_LINK_JUNK_PATTERNS,
  URL_SHORTENERS,
  PAYMENT_LINK_VALIDATION,
  PAYMENT_LINK_AI_CONFIG,
} from './constants';

// Preprocessing
export { preprocessEmail, htmlToText, removeFooters, extractContext } from './preprocessEmail';

// Candidate Extraction
export {
  extractCandidates,
  extractAmountCandidates,
  extractDateCandidates,
  extractNameCandidates,
  calculateKeywordScore,
  checkIfShouldSkip,
} from './extractCandidates';

// AI Extraction
export { extractWithClaude, createMockExtraction } from './anthropicExtract';

// Bill Classification
export { classifyBillEmail } from './classifyBillEmail';
export type { BillAIResult } from './classifyBillEmail';
export { BILL_SYSTEM_PROMPT, buildBillUserPrompt } from './claudePrompts';
export type { BillPromptEmailInput } from './claudePrompts';

// Validation
export { validateExtraction, determineRoute } from './validateExtraction';

// Payment Link Extraction
export {
  extractPaymentLinkCandidates,
  extractDomainFromEmail,
} from './extractPaymentLinkCandidates';

// Payment Link AI Selection
export {
  pickPaymentLinkWithClaude,
  createMockPaymentLinkSelection,
} from './anthropicPickPaymentLink';

// Payment Link Validation
export {
  validatePaymentLink,
  validatePaymentLinkSimple,
} from './validatePaymentLink';

// Main Pipeline
export {
  processEmail,
  processEmailBatch,
  getReviewQueue,
  confirmExtraction,
  rejectExtraction,
} from './processEmail';
