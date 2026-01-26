/**
 * AI Bill Extraction Types
 *
 * TypeScript interfaces for the simplified single-email extraction system.
 */

import { BillCategory, RecurrenceInterval } from '@/types';

/**
 * Input format for email extraction
 */
export interface EmailInput {
  id: string;
  from: string;
  subject: string;
  body: string;
}

/**
 * Raw AI extraction result (before date normalization)
 */
export interface RawAIExtraction {
  name: string;
  amount: number | null;
  due_date_raw: string | null;  // Exact text from email (e.g., "January 25, 2026", "Jan 25", "due in 5 days")
  category: BillCategory | null;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  payment_url: string | null;  // Payment link from email (e.g., "Pay Now" button URL)
  confidence: number;
  skip: boolean;
  skip_reason: string | null;
}

/**
 * Processed bill with normalized date
 */
export interface ProcessedBill {
  source_email_id: string;
  name: string;
  amount: number | null;
  due_date: string | null;  // YYYY-MM-DD format
  due_date_raw: string | null;  // Original text from email
  category: BillCategory | null;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  payment_url: string | null;  // Payment link from email
  confidence: number;
  needs_review: boolean;
  review_reasons: string[];
}

/**
 * Extraction error result
 */
export interface ExtractionError {
  source_email_id: string;
  error: string;
}

/**
 * Result of processing a single email
 */
export type ExtractionResult =
  | { success: true; bill: ProcessedBill }
  | { success: false; skipped: true; reason: string; source_email_id: string }
  | { success: false; skipped: false; error: string; source_email_id: string };

/**
 * Batch processing options
 */
export interface BatchProcessingOptions {
  concurrency?: number;  // Max concurrent API calls (default: 5)
  skipAI?: boolean;  // Use mock extraction instead
}
