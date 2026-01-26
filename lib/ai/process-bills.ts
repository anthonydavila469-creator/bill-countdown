/**
 * Parallel Bill Processing
 *
 * Process multiple emails in parallel with optional rate limiting.
 */

import { EmailInput, ProcessedBill, ExtractionResult, BatchProcessingOptions } from './types';
import { extractBillFromEmail, createMockBillExtraction } from './extract-bill';

/**
 * Process all emails in parallel (no rate limiting)
 *
 * Use this for small batches where rate limits aren't a concern.
 *
 * @param emails - Array of emails to process
 * @param options - Processing options
 * @returns Array of successfully extracted bills
 */
export async function processAllBills(
  emails: EmailInput[],
  options: BatchProcessingOptions = {}
): Promise<ProcessedBill[]> {
  const { skipAI = false } = options;

  console.log(`[processAllBills] Processing ${emails.length} emails (skipAI: ${skipAI})`);

  // Process all emails in parallel
  const results = await Promise.all(
    emails.map(email =>
      skipAI
        ? Promise.resolve(createMockBillExtraction(email))
        : extractBillFromEmail(email)
    )
  );

  // Filter to successful extractions
  const bills: ProcessedBill[] = [];
  let skipped = 0;
  let errors = 0;

  for (const result of results) {
    if (result.success) {
      bills.push(result.bill);
    } else if (result.skipped) {
      skipped++;
    } else {
      errors++;
    }
  }

  console.log(`[processAllBills] Complete: ${bills.length} bills, ${skipped} skipped, ${errors} errors`);

  return bills;
}

/**
 * Process emails with rate limiting (concurrency control)
 *
 * Use this for larger batches to avoid API rate limits.
 *
 * @param emails - Array of emails to process
 * @param options - Processing options including concurrency limit
 * @returns Array of successfully extracted bills
 */
export async function processAllBillsRateLimited(
  emails: EmailInput[],
  options: BatchProcessingOptions = {}
): Promise<ProcessedBill[]> {
  const { concurrency = 5, skipAI = false } = options;

  console.log(`[processAllBillsRateLimited] Processing ${emails.length} emails (concurrency: ${concurrency}, skipAI: ${skipAI})`);

  const bills: ProcessedBill[] = [];
  let skipped = 0;
  let errors = 0;

  // Process in batches of `concurrency` size
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);

    console.log(`[processAllBillsRateLimited] Batch ${Math.floor(i / concurrency) + 1}: processing ${batch.length} emails`);

    const results = await Promise.all(
      batch.map(email =>
        skipAI
          ? Promise.resolve(createMockBillExtraction(email))
          : extractBillFromEmail(email)
      )
    );

    // Collect results
    for (const result of results) {
      if (result.success) {
        bills.push(result.bill);
      } else if (result.skipped) {
        skipped++;
      } else {
        errors++;
      }
    }

    // Small delay between batches to be nice to the API
    if (i + concurrency < emails.length && !skipAI) {
      await sleep(100);
    }
  }

  console.log(`[processAllBillsRateLimited] Complete: ${bills.length} bills, ${skipped} skipped, ${errors} errors`);

  return bills;
}

/**
 * Process emails and return detailed results
 *
 * Returns all results including skipped and errors for debugging.
 */
export async function processAllBillsDetailed(
  emails: EmailInput[],
  options: BatchProcessingOptions = {}
): Promise<{
  bills: ProcessedBill[];
  skipped: Array<{ email_id: string; reason: string }>;
  errors: Array<{ email_id: string; error: string }>;
}> {
  const { concurrency = 5, skipAI = false } = options;

  const bills: ProcessedBill[] = [];
  const skipped: Array<{ email_id: string; reason: string }> = [];
  const errors: Array<{ email_id: string; error: string }> = [];

  // Process in batches
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);

    const results = await Promise.all(
      batch.map(email =>
        skipAI
          ? Promise.resolve(createMockBillExtraction(email))
          : extractBillFromEmail(email)
      )
    );

    for (const result of results) {
      if (result.success) {
        bills.push(result.bill);
      } else if (result.skipped) {
        skipped.push({
          email_id: result.source_email_id,
          reason: result.reason,
        });
      } else {
        errors.push({
          email_id: result.source_email_id,
          error: result.error,
        });
      }
    }

    // Small delay between batches
    if (i + concurrency < emails.length && !skipAI) {
      await sleep(100);
    }
  }

  return { bills, skipped, errors };
}

// Helper function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
