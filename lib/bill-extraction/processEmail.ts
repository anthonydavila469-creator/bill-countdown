/**
 * Main orchestrator for the Bill Extraction Pipeline
 * Coordinates all stages of extraction from raw email to final result
 */

import { Bill } from '@/types';
import { createClient } from '@/lib/supabase/server';
import {
  ProcessEmailOptions,
  ExtractionPipelineResult,
  BillExtraction,
  RawEmail,
  BatchScanResult,
  PaymentLinkPipelineResult,
  PaymentLinkEvidence,
} from './types';
import { preprocessEmail } from './preprocessEmail';
import { extractCandidates } from './extractCandidates';
import { extractWithClaude, createMockExtraction } from './anthropicExtract';
import { validateExtraction, determineRoute } from './validateExtraction';
import { AI_CONFIG, PAYMENT_LINK_VALIDATION } from './constants';
import { extractPaymentLinkCandidates, extractDomainFromEmail } from './extractPaymentLinkCandidates';
import { pickPaymentLinkWithClaude, createMockPaymentLinkSelection } from './anthropicPickPaymentLink';
import { validatePaymentLink } from './validatePaymentLink';

// ============================================================================
// Database Operations
// ============================================================================

/**
 * Store raw email in database
 */
async function storeRawEmail(
  userId: string,
  email: ProcessEmailOptions['email']
): Promise<RawEmail | null> {
  const supabase = await createClient();

  // Preprocess the email
  const { cleanedText } = preprocessEmail(
    email.body_plain || null,
    email.body_html || null
  );

  const { data, error } = await supabase
    .from('emails_raw')
    .upsert({
      user_id: userId,
      gmail_message_id: email.gmail_message_id,
      subject: email.subject,
      from_address: email.from,
      date_received: email.date,
      body_plain: email.body_plain || null,
      body_html: email.body_html || null,
      body_cleaned: cleanedText,
      attachments: email.attachments || [],
    }, {
      onConflict: 'user_id,gmail_message_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to store raw email:', error);
    return null;
  }

  return data as RawEmail;
}

/**
 * Store extraction result in database
 */
async function storeExtraction(
  userId: string,
  emailRawId: string | null,
  extraction: Partial<BillExtraction>
): Promise<BillExtraction | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bill_extractions')
    .insert({
      user_id: userId,
      email_raw_id: emailRawId,
      ...extraction,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to store extraction:', error);
    return null;
  }

  return data as BillExtraction;
}

/**
 * Create a bill from extraction
 */
async function createBillFromExtraction(
  userId: string,
  extraction: BillExtraction,
  gmailMessageId: string
): Promise<string | null> {
  const supabase = await createClient();

  // Use corrected values if available, otherwise extracted values
  const name = extraction.user_corrected_name || extraction.extracted_name;
  const amount = extraction.user_corrected_amount ?? extraction.extracted_amount;
  const dueDate = extraction.user_corrected_due_date || extraction.extracted_due_date;
  const category = extraction.user_corrected_category || extraction.extracted_category;

  // Include payment URL if confidence is above threshold
  const paymentUrl = (extraction.payment_confidence ?? 0) >= PAYMENT_LINK_VALIDATION.autoFillThreshold
    ? extraction.payment_url
    : null;

  if (!name || !dueDate) {
    console.error('Cannot create bill: missing name or due date');
    return null;
  }

  const { data, error } = await supabase
    .from('bills')
    .insert({
      user_id: userId,
      name,
      amount,
      due_date: dueDate,
      category,
      source: 'gmail',
      gmail_message_id: gmailMessageId,
      is_recurring: false,
      payment_url: paymentUrl,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create bill:', error);
    return null;
  }

  // Update extraction with created bill ID
  await supabase
    .from('bill_extractions')
    .update({ created_bill_id: data.id })
    .eq('id', extraction.id);

  return data.id;
}

/**
 * Get existing bills for duplicate checking
 */
async function getExistingBills(userId: string): Promise<Bill[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to get existing bills:', error);
    return [];
  }

  return data as Bill[];
}

/**
 * Check if email has already been processed
 */
async function checkAlreadyProcessed(
  userId: string,
  gmailMessageId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('emails_raw')
    .select('id, processed_at')
    .eq('user_id', userId)
    .eq('gmail_message_id', gmailMessageId)
    .single();

  return data?.processed_at !== null;
}

// ============================================================================
// Payment Link Extraction
// ============================================================================

/**
 * Extract payment link from email HTML
 */
async function extractPaymentLinkFromEmail(
  bodyHtml: string | null,
  vendorName: string | null,
  senderDomain: string,
  subject: string,
  skipAI: boolean = false
): Promise<PaymentLinkPipelineResult> {
  // Stage 1: Extract candidates from HTML
  const candidatesResult = extractPaymentLinkCandidates(bodyHtml);

  if (candidatesResult.skipReason || candidatesResult.candidates.length === 0) {
    return {
      url: null,
      confidence: 0,
      evidence: null,
      candidates: [],
    };
  }

  // Stage 2: AI selection (or mock)
  const aiResult = skipAI
    ? createMockPaymentLinkSelection(candidatesResult.candidates)
    : await pickPaymentLinkWithClaude({
        vendorName,
        fromDomain: senderDomain,
        subject,
        candidates: candidatesResult.candidates,
      });

  if (!aiResult.paymentUrl) {
    return {
      url: null,
      confidence: 0,
      evidence: null,
      candidates: candidatesResult.candidates,
    };
  }

  // Stage 3: Validate the selected URL
  const validationResult = await validatePaymentLink(
    aiResult.paymentUrl,
    senderDomain,
    vendorName
  );

  if (!validationResult.isValid) {
    console.warn('Payment link validation failed:', validationResult.errors);
    return {
      url: null,
      confidence: 0,
      evidence: {
        selectedUrl: aiResult.paymentUrl,
        anchorText: aiResult.evidence,
        aiReasoning: aiResult.reasoning,
        validationPassed: false,
      },
      candidates: candidatesResult.candidates,
    };
  }

  // Success - return validated payment link
  return {
    url: validationResult.url,
    confidence: aiResult.confidence,
    evidence: {
      selectedUrl: aiResult.paymentUrl,
      anchorText: aiResult.evidence,
      aiReasoning: aiResult.reasoning,
      validationPassed: true,
    },
    candidates: candidatesResult.candidates,
  };
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Process a single email through the extraction pipeline
 */
export async function processEmail(
  options: ProcessEmailOptions
): Promise<ExtractionPipelineResult> {
  const { userId, email, skipAI = false, forceReprocess = false } = options;

  try {
    // Check if already processed (unless forcing reprocess)
    if (!forceReprocess) {
      const alreadyProcessed = await checkAlreadyProcessed(userId, email.gmail_message_id);
      if (alreadyProcessed) {
        return {
          success: true,
          emailId: email.gmail_message_id,
          gmailMessageId: email.gmail_message_id,
          extraction: null,
          route: 'rejected',
          error: 'Email already processed',
        };
      }
    }

    // Stage 1: Preprocess and store raw email
    const rawEmail = await storeRawEmail(userId, email);
    const cleanedBody = rawEmail?.body_cleaned || preprocessEmail(
      email.body_plain || null,
      email.body_html || null
    ).cleanedText;

    // Stage 2: Extract candidates (deterministic)
    const candidates = extractCandidates(
      email.from,
      email.subject,
      cleanedBody
    );

    // Early exit if promotional or low keyword score
    if (candidates.isPromotional || candidates.skipReason) {
      // Mark as processed but rejected
      if (rawEmail) {
        const supabase = await createClient();
        await supabase
          .from('emails_raw')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', rawEmail.id);
      }

      return {
        success: true,
        emailId: rawEmail?.id || email.gmail_message_id,
        gmailMessageId: email.gmail_message_id,
        extraction: null,
        route: 'rejected',
        error: candidates.skipReason || 'Promotional email',
      };
    }

    // Stage 3+4: Claude AI extraction (or mock if skipAI)
    const aiRequest = {
      emailId: rawEmail?.id || email.gmail_message_id,
      subject: email.subject,
      from: email.from,
      cleanedBody: cleanedBody.substring(0, AI_CONFIG.maxBodyLength),
      candidateAmounts: candidates.amounts,
      candidateDates: candidates.dates,
      candidateNames: candidates.names,
    };

    const aiResult = skipAI
      ? createMockExtraction(aiRequest)
      : await extractWithClaude(aiRequest);

    // Early exit if AI says not a bill
    if (!aiResult.isBill) {
      if (rawEmail) {
        const supabase = await createClient();
        await supabase
          .from('emails_raw')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', rawEmail.id);
      }

      return {
        success: true,
        emailId: rawEmail?.id || email.gmail_message_id,
        gmailMessageId: email.gmail_message_id,
        extraction: null,
        route: 'rejected',
        error: 'Not classified as a bill by AI',
      };
    }

    // Stage 5: Payment Link Extraction
    const senderDomain = extractDomainFromEmail(email.from);
    const paymentLinkResult = await extractPaymentLinkFromEmail(
      email.body_html || null,
      aiResult.name,
      senderDomain,
      email.subject,
      skipAI
    );

    // Stage 6: Validate and score
    const existingBills = await getExistingBills(userId);
    const validation = validateExtraction(
      aiResult,
      { amounts: candidates.amounts, dates: candidates.dates },
      existingBills
    );

    // Determine route
    const route = determineRoute(
      validation.adjustedConfidence.overall,
      validation.isDuplicate
    );

    // Store extraction (including payment link data)
    const extraction = await storeExtraction(userId, rawEmail?.id || null, {
      status: route === 'auto_accept' ? 'auto_accepted' : route,
      extracted_name: aiResult.name,
      extracted_amount: aiResult.amount,
      extracted_due_date: aiResult.dueDate,
      extracted_category: aiResult.category,
      confidence_overall: validation.adjustedConfidence.overall,
      confidence_amount: validation.adjustedConfidence.amount,
      confidence_due_date: validation.adjustedConfidence.dueDate,
      confidence_name: validation.adjustedConfidence.name,
      evidence_snippets: aiResult.evidence,
      candidate_amounts: candidates.amounts,
      candidate_dates: candidates.dates,
      ai_model_used: skipAI ? 'mock' : AI_CONFIG.model,
      ai_raw_response: aiResult.reasoning,
      ai_tokens_used: aiResult.tokensUsed || null,
      is_duplicate: validation.isDuplicate,
      // Payment link fields
      payment_url: paymentLinkResult.url,
      payment_confidence: paymentLinkResult.confidence,
      payment_evidence: paymentLinkResult.evidence,
      candidate_payment_links: paymentLinkResult.candidates,
      duplicate_of_bill_id: validation.duplicateBillId || null,
      duplicate_reason: validation.duplicateReason || null,
    });

    // Auto-accept: create bill immediately
    if (route === 'auto_accept' && extraction) {
      await createBillFromExtraction(userId, extraction, email.gmail_message_id);
    }

    // Mark email as processed
    if (rawEmail) {
      const supabase = await createClient();
      await supabase
        .from('emails_raw')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', rawEmail.id);
    }

    return {
      success: true,
      emailId: rawEmail?.id || email.gmail_message_id,
      gmailMessageId: email.gmail_message_id,
      extraction,
      route,
    };
  } catch (error) {
    console.error('Pipeline error:', error);
    return {
      success: false,
      emailId: email.gmail_message_id,
      gmailMessageId: email.gmail_message_id,
      extraction: null,
      route: 'rejected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process multiple emails in batch
 */
export async function processEmailBatch(
  userId: string,
  emails: ProcessEmailOptions['email'][],
  options: { skipAI?: boolean; forceReprocess?: boolean } = {}
): Promise<BatchScanResult> {
  const results: ExtractionPipelineResult[] = [];
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let autoAccepted = 0;
  let needsReview = 0;
  let rejected = 0;

  for (const email of emails) {
    const result = await processEmail({
      userId,
      email,
      skipAI: options.skipAI,
      forceReprocess: options.forceReprocess,
    });

    results.push(result);

    if (!result.success) {
      errors++;
    } else if (result.error?.includes('already processed')) {
      skipped++;
    } else {
      processed++;
      switch (result.route) {
        case 'auto_accept':
          autoAccepted++;
          break;
        case 'needs_review':
          needsReview++;
          break;
        case 'rejected':
          rejected++;
          break;
      }
    }
  }

  return {
    totalEmails: emails.length,
    processed,
    skipped,
    errors,
    autoAccepted,
    needsReview,
    rejected,
    results,
  };
}

// ============================================================================
// Review Queue Operations
// ============================================================================

/**
 * Get items in the review queue
 */
export async function getReviewQueue(
  userId: string,
  limit: number = 50
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bill_extractions')
    .select(`
      id,
      extracted_name,
      extracted_amount,
      extracted_due_date,
      extracted_category,
      confidence_overall,
      confidence_amount,
      confidence_due_date,
      evidence_snippets,
      is_duplicate,
      duplicate_reason,
      created_at,
      email_raw_id,
      emails_raw (
        subject,
        from_address,
        date_received
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'needs_review')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get review queue:', error);
    return [];
  }

  return data;
}

/**
 * Confirm an extraction (create bill)
 */
export async function confirmExtraction(
  userId: string,
  extractionId: string,
  corrections?: {
    name?: string;
    amount?: number;
    due_date?: string;
    category?: string;
  }
): Promise<{ success: boolean; billId?: string; error?: string }> {
  const supabase = await createClient();

  // Get the extraction
  const { data: extraction, error: fetchError } = await supabase
    .from('bill_extractions')
    .select('*, emails_raw(gmail_message_id)')
    .eq('id', extractionId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !extraction) {
    return { success: false, error: 'Extraction not found' };
  }

  // Update with corrections if provided
  if (corrections) {
    await supabase
      .from('bill_extractions')
      .update({
        user_corrected_name: corrections.name,
        user_corrected_amount: corrections.amount,
        user_corrected_due_date: corrections.due_date,
        user_corrected_category: corrections.category,
        reviewed_at: new Date().toISOString(),
        status: 'confirmed',
      })
      .eq('id', extractionId);
  } else {
    await supabase
      .from('bill_extractions')
      .update({
        reviewed_at: new Date().toISOString(),
        status: 'confirmed',
      })
      .eq('id', extractionId);
  }

  // Create the bill
  const gmailMessageId = extraction.emails_raw?.gmail_message_id || extractionId;
  const billId = await createBillFromExtraction(
    userId,
    { ...extraction, ...corrections } as BillExtraction,
    gmailMessageId
  );

  if (!billId) {
    return { success: false, error: 'Failed to create bill' };
  }

  return { success: true, billId };
}

/**
 * Reject an extraction
 */
export async function rejectExtraction(
  userId: string,
  extractionId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('bill_extractions')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', extractionId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
