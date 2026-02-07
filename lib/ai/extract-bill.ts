/**
 * Single Email Bill Extraction
 *
 * One Claude API call per email with date normalization and review flagging.
 */

import Anthropic from '@anthropic-ai/sdk';
import { EmailInput, ProcessedBill, ExtractionResult } from './types';
import { BILL_EXTRACTION_SYSTEM_PROMPT, buildEmailPrompt, parseAIResponse } from './prompts';
import { normalizeDueDate } from './date-utils';

// AI Configuration
const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1024,
};

// Singleton Anthropic client
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

/**
 * Extract bill information from a single email
 *
 * @param email - The email to process
 * @returns ExtractionResult with bill data, skip info, or error
 */
export async function extractBillFromEmail(
  email: EmailInput
): Promise<ExtractionResult> {
  const client = getAnthropicClient();

  try {
    // Build prompt
    const userPrompt = buildEmailPrompt(email);

    // Call Claude
    const message = await client.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      system: BILL_EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Log raw extraction result for debugging
    console.log(`[EXTRACT] Email: ${email.subject}`);
    console.log(`[EXTRACT] Result:`, responseText);

    // Parse AI response
    const parsed = parseAIResponse(responseText);

    if (!parsed) {
      console.error('[extractBillFromEmail] Failed to parse response for:', email.subject);
      return {
        success: false,
        skipped: false,
        error: 'Failed to parse AI response',
        source_email_id: email.id,
      };
    }

    // Handle skip
    if (parsed.skip) {
      console.log('[extractBillFromEmail] Skipped:', email.subject, '-', parsed.skip_reason);
      return {
        success: false,
        skipped: true,
        reason: parsed.skip_reason || 'Not a bill',
        source_email_id: email.id,
      };
    }

    // Normalize the due date
    const normalizedDate = normalizeDueDate(parsed.due_date_raw);

    // Determine if this needs review
    const reviewReasons: string[] = [];

    if (parsed.confidence < 0.6) {
      reviewReasons.push('Low confidence extraction');
    }

    if (!parsed.amount && !normalizedDate) {
      reviewReasons.push('Missing both amount and due date');
    }

    if (parsed.due_date_raw && !normalizedDate) {
      reviewReasons.push(`Could not parse date: "${parsed.due_date_raw}"`);
    }

    // Build processed bill
    const bill: ProcessedBill = {
      source_email_id: email.id,
      name: parsed.name,
      amount: parsed.amount,
      due_date: normalizedDate,
      due_date_raw: parsed.due_date_raw,
      category: parsed.category,
      is_recurring: parsed.is_recurring,
      recurrence_interval: parsed.recurrence_interval,
      payment_url: parsed.payment_url || null,
      confidence: parsed.confidence,
      needs_review: reviewReasons.length > 0,
      review_reasons: reviewReasons,
    };

    console.log('[extractBillFromEmail] Extracted:', {
      subject: email.subject.substring(0, 50),
      name: bill.name,
      amount: bill.amount,
      due_date: bill.due_date,
      confidence: bill.confidence,
      needs_review: bill.needs_review,
    });

    return {
      success: true,
      bill,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[extractBillFromEmail] Error:', email.subject, '-', errorMessage);

    return {
      success: false,
      skipped: false,
      error: errorMessage,
      source_email_id: email.id,
    };
  }
}

/**
 * Create a mock extraction for testing without API calls
 */
export function createMockBillExtraction(email: EmailInput): ExtractionResult {
  // Simple heuristics for mock extraction
  const subjectLower = email.subject.toLowerCase();
  const fromLower = email.from.toLowerCase();

  // Skip patterns
  const skipPatterns = [
    'payment received',
    'payment successful',
    'thank you for your payment',
    'order confirmation',
    'shipping',
    'newsletter',
    'special offer',
  ];

  for (const pattern of skipPatterns) {
    if (subjectLower.includes(pattern)) {
      return {
        success: false,
        skipped: true,
        reason: `Matched skip pattern: ${pattern}`,
        source_email_id: email.id,
      };
    }
  }

  // Extract name from sender
  let name = 'Unknown Bill';
  const senderMatch = email.from.match(/^([^<]+)/);
  if (senderMatch) {
    name = senderMatch[1].trim().replace(/"/g, '');
  }

  // Determine category from sender/subject
  let category: ProcessedBill['category'] = 'other';
  if (fromLower.includes('netflix') || fromLower.includes('spotify') || fromLower.includes('hulu')) {
    category = 'subscription';
  } else if (fromLower.includes('chase') || fromLower.includes('citi') || fromLower.includes('capital one')) {
    category = 'credit_card';
  } else if (fromLower.includes('at&t') || fromLower.includes('verizon') || fromLower.includes('t-mobile')) {
    category = 'phone';
  }

  return {
    success: true,
    bill: {
      source_email_id: email.id,
      name,
      amount: null,
      due_date: null,
      due_date_raw: null,
      category,
      is_recurring: true,
      recurrence_interval: 'monthly',
      payment_url: null,
      confidence: 0.5,
      needs_review: true,
      review_reasons: ['Mock extraction - needs verification'],
    },
  };
}
