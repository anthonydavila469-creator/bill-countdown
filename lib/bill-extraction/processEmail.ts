/**
 * Main orchestrator for the Bill Extraction Pipeline
 * Coordinates all stages of extraction from raw email to final result
 */

import { Bill, BillCategory } from '@/types';
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
import { extractWithClaude, extractTiered, createMockExtraction, TieredExtractionResult } from './anthropicExtract';
import { classifyBillEmail, BillAIResult } from './classifyBillEmail';
import { BillPromptEmailInput } from './claudePrompts';
import { validateExtraction, determineRoute } from './validateExtraction';
import { AI_CONFIG, PAYMENT_LINK_VALIDATION } from './constants';

/**
 * Parse from address to extract name and email
 */
function parseFromAddress(from: string): { fromName: string; fromEmail: string } {
  const match = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  return {
    fromName: match?.[1]?.trim() || '',
    fromEmail: match?.[2]?.trim() || from,
  };
}

/**
 * Create a mock classification for testing without API calls
 */
function createMockClassification(email: { subject: string; from: string; body: string }): BillAIResult {
  const combined = (email.subject + ' ' + email.body).toLowerCase();

  const hasBillKeywords = /statement|bill|payment due|amount due|balance due|invoice|autopay/.test(combined);
  const hasPaymentConfirmation = /payment received|thank you for your payment|payment confirmation/.test(combined);

  if (hasPaymentConfirmation && !hasBillKeywords) {
    return {
      decision: 'NOT_BILL',
      confidence: 0.8,
      vendorName: null,
      vendorKey: null,
      billType: null,
      amountDue: null,
      dueDate: null,
      currency: null,
      accountHint: null,
      paymentStatus: 'PAID',
      paymentLink: null,
      evidence: { billSignals: [], notBillSignals: ['Payment confirmation'] },
      reason: 'Mock: Payment confirmation detected',
    };
  }

  if (hasBillKeywords) {
    return {
      decision: 'BILL',
      confidence: 0.7,
      vendorName: null,
      vendorKey: null,
      billType: null,
      amountDue: null,
      dueDate: null,
      currency: 'USD',
      accountHint: null,
      paymentStatus: 'DUE',
      paymentLink: null,
      evidence: { billSignals: ['Bill keywords'], notBillSignals: [] },
      reason: 'Mock: Bill keywords detected',
    };
  }

  return {
    decision: 'UNCERTAIN',
    confidence: 0.5,
    vendorName: null,
    vendorKey: null,
    billType: null,
    amountDue: null,
    dueDate: null,
    currency: null,
    accountHint: null,
    paymentStatus: 'UNKNOWN',
    paymentLink: null,
    evidence: { billSignals: [], notBillSignals: [] },
    reason: 'Mock: No clear signals',
  };
}

/**
 * Map Claude's billType to BillCategory
 * Claude returns: credit_card, utility, rent, insurance, loan, subscription, invoice, autopay, other
 * BillCategory is: utilities, subscription, rent, housing, insurance, phone, internet, credit_card, loan, health, other
 */
function mapBillTypeToCategory(billType: string | null): BillCategory | null {
  if (!billType) return null;

  const mapping: Record<string, BillCategory> = {
    'credit_card': 'credit_card',
    'utility': 'utilities',      // singular -> plural
    'rent': 'rent',
    'insurance': 'insurance',
    'loan': 'loan',
    'subscription': 'subscription',
    'invoice': 'other',          // no direct mapping
    'autopay': 'other',          // no direct mapping
    'other': 'other',
  };

  return mapping[billType] ?? 'other';
}

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

  // Only return true if the email exists AND has been processed
  return data !== null && data.processed_at !== null;
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
        console.log(`[Stage] SKIP "${email.subject.substring(0, 40)}" - already processed`);
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

    // Debug: Log body lengths
    console.log('[Body Debug]', JSON.stringify({
      subject: email.subject.substring(0, 50),
      bodyPlainLen: (email.body_plain ?? '').length,
      bodyHtmlLen: (email.body_html ?? '').length,
    }));

    const cleanedBody = rawEmail?.body_cleaned || preprocessEmail(
      email.body_plain || null,
      email.body_html || null
    ).cleanedText;

    // Debug: Log cleaned body preview
    console.log('[Body Preview]', JSON.stringify({
      subject: email.subject.substring(0, 50),
      cleanedLen: cleanedBody.length,
      preview: cleanedBody.substring(0, 300).replace(/\n/g, ' '),
    }));

    // Stage 2: Extract candidates (deterministic)
    const candidates = extractCandidates(
      email.from,
      email.subject,
      cleanedBody
    );
    console.log(`[Stage] CANDIDATES "${email.subject.substring(0, 40)}" - skip=${candidates.skipReason || 'none'}, promo=${candidates.isPromotional}`);

    // Early exit if promotional or low keyword score
    if (candidates.isPromotional || candidates.skipReason) {
      console.log(`[Pipeline] Skipping email "${email.subject}" - Reason: ${candidates.skipReason || 'Promotional email'}`);

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

    // Stage 2.5: Claude Classification (BILL / NOT_BILL / UNCERTAIN)
    const { fromName, fromEmail } = parseFromAddress(email.from);
    const classificationInput: BillPromptEmailInput = {
      fromName,
      fromEmail,
      subject: email.subject,
      receivedDate: email.date,
      bodyTextTop: cleanedBody.substring(0, 6000),
      amountCandidates: candidates.amounts.map(a => `$${a.value.toFixed(2)}`),
      dateCandidates: candidates.dates.map(d => d.value),
      linkCandidates: [], // Payment links are extracted in Stage 5
    };

    const classification = skipAI
      ? createMockClassification({ subject: email.subject, from: email.from, body: cleanedBody })
      : await classifyBillEmail(classificationInput);

    // Log classification result
    console.log('[Classification]', JSON.stringify({
      subject: email.subject.substring(0, 50),
      decision: classification.decision,
      confidence: classification.confidence,
      vendorName: classification.vendorName,
      billType: classification.billType,
      amountDue: classification.amountDue,
      dueDate: classification.dueDate,
      paymentStatus: classification.paymentStatus,
    }));

    // Get best fallback name from rule-based extraction
    // This ensures we have a name even when Claude's vendorName is null
    const fallbackName = candidates.names[0]?.value || null;

    // Route based on classification decision
    if (classification.decision === 'NOT_BILL') {
      console.log(`[Pipeline] Classifier rejected "${email.subject}" - NOT_BILL`);

      // Store rejection with FULL Claude JSON
      const extraction = await storeExtraction(userId, rawEmail?.id || null, {
        status: 'rejected',
        extracted_name: classification.vendorName || fallbackName,
        extracted_category: mapBillTypeToCategory(classification.billType),
        ai_raw_response: JSON.stringify(classification), // Store FULL JSON
        confidence_overall: classification.confidence,
      });

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
        route: 'rejected',
        error: `Classified as NOT_BILL: ${classification.reason}`,
      };
    }

    if (classification.decision === 'UNCERTAIN') {
      console.log(`[Pipeline] Classifier uncertain about "${email.subject}" - running full extraction before storing`);

      // Run full extraction to get amounts/dates (same as BILL path)
      const aiRequest = {
        emailId: rawEmail?.id || email.gmail_message_id,
        subject: email.subject,
        from: email.from,
        cleanedBody: cleanedBody.substring(0, AI_CONFIG.maxBodyLength),
        candidateAmounts: candidates.amounts,
        candidateDates: candidates.dates,
        candidateNames: candidates.names,
      };

      const aiResult: TieredExtractionResult = skipAI
        ? { ...createMockExtraction(aiRequest), tier: 3 as const, tierName: 'sonnet' as const, processingTimeMs: 0 }
        : await extractTiered(aiRequest);

      console.log(`[Stage] AI Extract (UNCERTAIN) "${email.subject.substring(0, 40)}" - tier=${aiResult.tier} (${aiResult.tierName}), name=${aiResult.name}, amount=${aiResult.amount}, dueDate=${aiResult.dueDate}`);

      // Use extracted data, falling back to classifier data, then rule-based
      const extractedName = aiResult.name || classification.vendorName || fallbackName;
      const extractedAmount = aiResult.amount ?? classification.amountDue;
      const extractedDueDate = aiResult.dueDate || classification.dueDate;

      // Validate extraction (same as BILL path) to apply confidence threshold
      const augmentedAiResult = {
        ...aiResult,
        name: extractedName,
        amount: extractedAmount,
        dueDate: extractedDueDate,
      };
      const existingBills = await getExistingBills(userId);
      const validation = validateExtraction(
        augmentedAiResult,
        { amounts: candidates.amounts, dates: candidates.dates },
        existingBills
      );

      // Use determineRoute() to check against confidence threshold
      const route = determineRoute(validation.adjustedConfidence.overall, validation.isDuplicate);

      // Determine status based on route (respects needsReviewThreshold of 0.60)
      type ExtractionStatus = 'pending' | 'needs_review' | 'confirmed' | 'rejected' | 'auto_accepted';
      let finalStatus: ExtractionStatus;
      if (validation.isDuplicate) {
        finalStatus = 'rejected';
      } else if (route === 'auto_accept') {
        finalStatus = 'auto_accepted';
      } else if (route === 'needs_review') {
        finalStatus = 'needs_review';
      } else {
        finalStatus = 'rejected'; // Below 0.60 threshold
      }

      console.log(`[Pipeline] UNCERTAIN "${email.subject.substring(0, 40)}" - confidence=${validation.adjustedConfidence.overall.toFixed(2)}, route=${route}, status=${finalStatus}`);

      // Log tier analytics
      console.log(`[Analytics] UNCERTAIN path - tier=${aiResult.tier}, model=${aiResult.tierName}, confidence=${validation.adjustedConfidence.overall.toFixed(2)}, tokens=${aiResult.tokensUsed || 0}, timeMs=${aiResult.processingTimeMs}`);

      // Store with validated confidence and proper status
      const extraction = await storeExtraction(userId, rawEmail?.id || null, {
        status: finalStatus,
        extracted_name: extractedName,
        extracted_amount: extractedAmount,
        extracted_due_date: extractedDueDate,
        extracted_category: aiResult.category || mapBillTypeToCategory(classification.billType),
        confidence_overall: validation.adjustedConfidence.overall,
        confidence_amount: validation.adjustedConfidence.amount,
        confidence_due_date: validation.adjustedConfidence.dueDate,
        confidence_name: validation.adjustedConfidence.name,
        evidence_snippets: aiResult.evidence,
        candidate_amounts: candidates.amounts,
        candidate_dates: candidates.dates,
        ai_model_used: skipAI ? 'mock' : `tier-${aiResult.tier}-${aiResult.tierName}`,
        ai_raw_response: JSON.stringify({ classification, extraction: aiResult, tier: aiResult.tier, tierName: aiResult.tierName, processingTimeMs: aiResult.processingTimeMs }), // Store FULL JSON with tier info
        ai_tokens_used: aiResult.tokensUsed || null,
        is_duplicate: validation.isDuplicate,
        payment_url: classification.paymentLink,
        duplicate_of_bill_id: validation.duplicateBillId || null,
        duplicate_reason: validation.duplicateReason || null,
      });

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
    }

    // decision === 'BILL' - continue with existing extraction pipeline
    console.log(`[Pipeline] Classifier approved "${email.subject}" as BILL - continuing extraction`);

    // Stage 3+4: Tiered AI extraction (regex → Haiku → Sonnet, or mock if skipAI)
    const aiRequest = {
      emailId: rawEmail?.id || email.gmail_message_id,
      subject: email.subject,
      from: email.from,
      cleanedBody: cleanedBody.substring(0, AI_CONFIG.maxBodyLength),
      candidateAmounts: candidates.amounts,
      candidateDates: candidates.dates,
      candidateNames: candidates.names,
    };

    const aiResult: TieredExtractionResult = skipAI
      ? { ...createMockExtraction(aiRequest), tier: 3 as const, tierName: 'sonnet' as const, processingTimeMs: 0 }
      : await extractTiered(aiRequest);
    console.log(`[Stage] AI Extract "${email.subject.substring(0, 40)}" - tier=${aiResult.tier} (${aiResult.tierName}), name=${aiResult.name}, amount=${aiResult.amount}, dueDate=${aiResult.dueDate}`);

    // Note: isBill check removed - classifier already approved this email as BILL
    // Use classification data to augment extraction if AI extraction is missing data
    // Fallback chain: AI extraction → Claude classification → rule-based extraction
    const extractedName = aiResult.name || classification.vendorName || fallbackName;
    const extractedAmount = aiResult.amount ?? classification.amountDue;
    const extractedDueDate = aiResult.dueDate || classification.dueDate;

    // Post-validation: Reject if extracted amount matches a minimum payment candidate
    if (aiResult.amount !== null) {
      const minimumCandidate = candidates.amounts.find(
        a => a.isMinimum && Math.abs(a.value - aiResult.amount!) < 0.01
      );
      if (minimumCandidate) {
        console.log(`[Pipeline] Rejecting "${email.subject}" - Extracted amount $${aiResult.amount} is a minimum payment`);

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
          error: 'Extracted amount is a minimum payment, not total balance',
        };
      }
    }

    // Stage 5: Payment Link Extraction
    const senderDomain = extractDomainFromEmail(email.from);
    const paymentLinkResult = await extractPaymentLinkFromEmail(
      email.body_html || null,
      extractedName,
      senderDomain,
      email.subject,
      skipAI
    );

    // Stage 6: Validate and score
    // Create augmented AI result for validation
    const augmentedAiResult = {
      ...aiResult,
      name: extractedName,
      amount: extractedAmount,
      dueDate: extractedDueDate,
    };
    const existingBills = await getExistingBills(userId);
    const validation = validateExtraction(
      augmentedAiResult,
      { amounts: candidates.amounts, dates: candidates.dates },
      existingBills
    );

    // Determine route (include payment link confidence for "view online" bills)
    const route = determineRoute(
      validation.adjustedConfidence.overall,
      validation.isDuplicate,
      paymentLinkResult.confidence
    );

    // Log tier analytics
    console.log(`[Analytics] BILL path - tier=${aiResult.tier}, model=${aiResult.tierName}, confidence=${validation.adjustedConfidence.overall.toFixed(2)}, tokens=${aiResult.tokensUsed || 0}, timeMs=${aiResult.processingTimeMs}`);

    console.log(`[Pipeline] Creating extraction for "${email.subject}" - route: ${route}`);

    // Determine clean status using ExtractionStatus type:
    // - duplicate → 'rejected' with is_duplicate flag
    // - auto_accept → 'auto_accepted'
    // - needs_review → 'needs_review'
    // - rejected → 'rejected'
    type ExtractionStatus = 'pending' | 'needs_review' | 'confirmed' | 'rejected' | 'auto_accepted';
    let finalStatus: ExtractionStatus;
    if (validation.isDuplicate) {
      finalStatus = 'rejected'; // Mark as rejected, is_duplicate flag distinguishes it
    } else if (route === 'auto_accept') {
      finalStatus = 'auto_accepted';
    } else if (route === 'needs_review') {
      finalStatus = 'needs_review';
    } else {
      finalStatus = 'rejected';
    }

    // Store extraction (including payment link data)
    // Use augmented values that combine classifier + extraction results
    const extraction = await storeExtraction(userId, rawEmail?.id || null, {
      status: finalStatus,
      extracted_name: extractedName,
      extracted_amount: extractedAmount,
      extracted_due_date: extractedDueDate,
      extracted_category: aiResult.category || mapBillTypeToCategory(classification.billType),
      confidence_overall: validation.adjustedConfidence.overall,
      confidence_amount: validation.adjustedConfidence.amount,
      confidence_due_date: validation.adjustedConfidence.dueDate,
      confidence_name: validation.adjustedConfidence.name,
      evidence_snippets: aiResult.evidence,
      candidate_amounts: candidates.amounts,
      candidate_dates: candidates.dates,
      ai_model_used: skipAI ? 'mock' : `tier-${aiResult.tier}-${aiResult.tierName}`,
      ai_raw_response: JSON.stringify({ 
        classification, 
        extraction: aiResult, 
        tier: aiResult.tier, 
        tierName: aiResult.tierName, 
        processingTimeMs: aiResult.processingTimeMs 
      }), // Store FULL JSON with tier info
      ai_tokens_used: aiResult.tokensUsed || null,
      is_duplicate: validation.isDuplicate,
      // Payment link fields - prefer classifier's link if extraction didn't find one
      payment_url: paymentLinkResult.url || classification.paymentLink,
      payment_confidence: paymentLinkResult.confidence,
      payment_evidence: paymentLinkResult.evidence,
      candidate_payment_links: paymentLinkResult.candidates,
      duplicate_of_bill_id: validation.duplicateBillId || null,
      duplicate_reason: validation.duplicateReason || null,
    });
    console.log(`[Stage] INSERT "${email.subject.substring(0, 40)}" - ok=${!!extraction}`);

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

    // Mark email as processed even on error to prevent infinite retry loops
    // First check if there's an existing emails_raw record for this email
    try {
      const supabase = await createClient();
      const { data: existingRaw } = await supabase
        .from('emails_raw')
        .select('id')
        .eq('user_id', userId)
        .eq('gmail_message_id', email.gmail_message_id)
        .single();

      if (existingRaw) {
        await supabase
          .from('emails_raw')
          .update({
            processed_at: new Date().toISOString(),
            processing_error: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', existingRaw.id);
        console.log(`[Pipeline] Marked email as processed with error: ${email.gmail_message_id}`);
      }
    } catch (updateError) {
      console.error('Failed to mark email as processed after error:', updateError);
    }

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
 * Normalize vendor name for duplicate detection
 */
function normalizeVendorName(name: string | null): string {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/credit\s*card/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a vendor is a utility (electric, gas, water)
 * Utilities are more aggressively deduplicated because bills are monthly
 */
function isUtilityVendor(name: string | null): boolean {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  const utilityPatterns = [
    /electric/i,
    /power/i,
    /energy/i,
    /gas(?:\s|$)/i,  // "gas" but not "vegas"
    /water/i,
    /utility/i,
    /sewer/i,
    /pge|sce|txu|duke|conedison|socalgas|national\s*grid/i,
  ];
  return utilityPatterns.some(p => p.test(lowerName));
}

/**
 * Check if two extractions are duplicates (same vendor, same due date)
 */
function isCrossExtractionDuplicate(
  extraction: { name: string | null; dueDate: string | null; amount: number | null },
  seenExtractions: Array<{ name: string; dueDate: string; amount: number | null }>
): { isDuplicate: boolean; reason?: string } {
  if (!extraction.name || !extraction.dueDate) {
    return { isDuplicate: false };
  }

  const normalizedName = normalizeVendorName(extraction.name);
  const isUtility = isUtilityVendor(extraction.name);

  for (const seen of seenExtractions) {
    const seenNormalizedName = normalizeVendorName(seen.name);

    // Check if names are similar (contain each other or very close)
    const namesSimilar =
      normalizedName.includes(seenNormalizedName) ||
      seenNormalizedName.includes(normalizedName) ||
      normalizedName === seenNormalizedName;

    if (!namesSimilar) continue;

    // Same vendor + same due date = duplicate
    if (extraction.dueDate === seen.dueDate) {
      return {
        isDuplicate: true,
        reason: `Duplicate of "${seen.name}" with same due date (${seen.dueDate})`,
      };
    }

    // Same vendor + same amount = likely duplicate
    if (extraction.amount !== null && seen.amount !== null) {
      if (Math.abs(extraction.amount - seen.amount) < 0.01) {
        const date1 = new Date(extraction.dueDate);
        const date2 = new Date(seen.dueDate);
        const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));

        // For utilities: same amount within 35 days = duplicate (monthly billing)
        // This catches payment confirmations that slip through with different dates
        if (isUtility && daysDiff <= 35) {
          return {
            isDuplicate: true,
            reason: `Utility duplicate of "${seen.name}" - same amount ($${seen.amount}) within ${Math.round(daysDiff)} days`,
          };
        }

        // For non-utilities: same amount within 7 days = likely duplicate
        if (!isUtility && daysDiff <= 7) {
          return {
            isDuplicate: true,
            reason: `Likely duplicate of "${seen.name}" - same amount ($${seen.amount}) within ${Math.round(daysDiff)} days`,
          };
        }
      }
    }
  }

  return { isDuplicate: false };
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

  // Debug counters for pipeline diagnostics
  let alreadyProcessedSkipped = 0;
  let passedCandidates = 0;
  let aiClassifiedAsBill = 0;
  let extractionsCreated = 0;

  // Track extractions for cross-extraction duplicate detection
  const seenExtractions: Array<{ name: string; dueDate: string; amount: number | null }> = [];

  for (const email of emails) {
    const result = await processEmail({
      userId,
      email,
      skipAI: options.skipAI,
      forceReprocess: options.forceReprocess,
    });

    // Check for cross-extraction duplicates
    if (result.success && result.extraction) {
      const crossDupeCheck = isCrossExtractionDuplicate(
        {
          name: result.extraction.extracted_name,
          dueDate: result.extraction.extracted_due_date,
          amount: result.extraction.extracted_amount,
        },
        seenExtractions
      );

      if (crossDupeCheck.isDuplicate) {
        console.log(`[Pipeline] Cross-extraction duplicate detected: "${email.subject}" - ${crossDupeCheck.reason}`);

        // Update the extraction status to rejected
        const supabase = await createClient();
        await supabase
          .from('bill_extractions')
          .update({
            status: 'rejected',
            is_duplicate: true,
            duplicate_reason: crossDupeCheck.reason,
          })
          .eq('id', result.extraction.id);

        result.route = 'rejected';
        result.extraction.status = 'rejected';
        result.extraction.is_duplicate = true;
        result.extraction.duplicate_reason = crossDupeCheck.reason || null;
      } else if (result.extraction.extracted_name && result.extraction.extracted_due_date) {
        // Track this extraction for future duplicate checks
        seenExtractions.push({
          name: result.extraction.extracted_name,
          dueDate: result.extraction.extracted_due_date,
          amount: result.extraction.extracted_amount,
        });
      }
    }

    results.push(result);

    if (!result.success) {
      errors++;
    } else if (result.error?.includes('already processed')) {
      skipped++;
      alreadyProcessedSkipped++;
    } else {
      processed++;
      // Track debug counters based on result
      if (result.extraction) {
        extractionsCreated++;
        aiClassifiedAsBill++;
        passedCandidates++;
      } else if (result.error?.includes('Not classified as a bill')) {
        // Passed candidates but AI rejected
        passedCandidates++;
      } else if (!result.error?.includes('Promotional') && !result.error?.includes('keyword score')) {
        // Passed candidate extraction stage
        passedCandidates++;
      }

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

  console.log(`[BATCH] Debug summary: alreadyProcessedSkipped=${alreadyProcessedSkipped}, passedCandidates=${passedCandidates}, aiClassifiedAsBill=${aiClassifiedAsBill}, extractionsCreated=${extractionsCreated}`);

  return {
    totalEmails: emails.length,
    processed,
    skipped,
    errors,
    autoAccepted,
    needsReview,
    rejected,
    results,
    debugSummary: {
      alreadyProcessedSkipped,
      passedCandidates,
      aiClassifiedAsBill,
      extractionsCreated,
    },
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
