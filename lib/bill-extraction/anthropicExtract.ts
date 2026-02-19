/**
 * Claude AI extraction for bill classification and data extraction
 * Combined classify + extract in a single API call for efficiency
 */

import Anthropic from '@anthropic-ai/sdk';
import { BillCategory } from '@/types';
import {
  AIExtractionRequest,
  AIExtractionResult,
  EvidenceSnippet,
} from './types';
import { AI_CONFIG, AI_CONFIG_HAIKU, TIER_CONFIG } from './constants';
import { KNOWN_BILLER_DOMAINS } from '../sync/known-billers';

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are a bill extraction assistant. Your job is to analyze emails and determine:
1. Is this email a bill/statement/invoice that requires payment?
2. If yes, extract the key information.

IMPORTANT DISTINCTIONS:
- A BILL is a request for payment (credit card statement, utility bill, subscription invoice)
- A PAYMENT CONFIRMATION is NOT a bill (it confirms payment was already made)
- A PROMOTIONAL EMAIL is NOT a bill (offers, discounts, marketing)
- A SHIPPING/ORDER notification is NOT a bill (unless it includes payment due)
- STATEMENT NOTIFICATIONS ARE BILLS: "Your statement is ready", "statement available", "Credit Card Statement" = isBill: true
- PAYMENT REMINDERS may be duplicates - only mark isBill: false if:
  - Subject says "reminder" AND contains NO amount/balance information in the body
  - If the email contains a statement balance or amount due, it IS a bill

CRITICAL AMOUNT RULES:
- NEVER extract the minimum payment amount. ONLY extract the TOTAL/FULL statement balance.
- If you see both "Minimum Payment Due: $25" and "New Balance: $354.04", ALWAYS use $354.04
- If the ONLY amount mentioned is a minimum payment, set amount to null
- Common patterns to AVOID: "minimum payment", "min due", "minimum due", "min payment due"
- Common patterns to USE: "total due", "new balance", "statement balance", "amount due", "balance due"

EXTRACTION GUIDELINES:
- For AMOUNT: Extract ONLY the total/full balance. If unsure, use the LARGER amount.
- For DUE DATE: Extract the actual payment due date, NOT the statement date or closing date
- For NAME: Be specific about the product (e.g., "Chase Sapphire" not just "Chase")
- For CATEGORY: Choose the most appropriate category

CATEGORIES:
- utilities: Electric, gas, water bills
- subscription: Netflix, Spotify, streaming services, software subscriptions
- rent: Rent payments
- housing: HOA fees, property taxes
- insurance: Auto, home, life insurance
- phone: Cell phone bills
- internet: Internet/cable service
- credit_card: Credit card statements
- loan: Mortgages, auto loans, student loans, personal loans
- health: Medical bills, health insurance
- other: Anything else

Always respond with valid JSON.`;

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Build the user prompt for Claude
 */
function buildExtractionPrompt(request: AIExtractionRequest): string {
  const candidateAmountsStr = request.candidateAmounts
    .slice(0, 5)
    .map(c => `$${c.value.toFixed(2)} (context: "${c.context.substring(0, 60)}...")`)
    .join('\n  ');

  const candidateDatesStr = request.candidateDates
    .slice(0, 5)
    .map(c => `${c.value} (context: "${c.context.substring(0, 60)}...")`)
    .join('\n  ');

  const candidateNamesStr = request.candidateNames
    .slice(0, 3)
    .map(c => `"${c.value}" (source: ${c.source}, confidence: ${c.confidence.toFixed(2)})`)
    .join('\n  ');

  // Truncate body to max length
  const truncatedBody = request.cleanedBody.length > AI_CONFIG.maxBodyLength
    ? request.cleanedBody.substring(0, AI_CONFIG.maxBodyLength) + '...[truncated]'
    : request.cleanedBody;

  return `Analyze this email and extract bill information.

EMAIL METADATA:
From: ${request.from}
Subject: ${request.subject}

EMAIL BODY:
${truncatedBody}

PRE-EXTRACTED CANDIDATES (from regex parsing):
Amounts:
  ${candidateAmountsStr || 'None found'}

Dates:
  ${candidateDatesStr || 'None found'}

Names:
  ${candidateNamesStr || 'None found'}

INSTRUCTIONS:
1. First, determine if this is a bill requiring payment
2. If it IS a bill, select or extract the correct amount, due date, name, and category
3. Prefer selecting from the pre-extracted candidates when they are correct
4. Provide evidence snippets for each extracted field

Respond with this exact JSON structure:
{
  "isBill": true/false,
  "name": "Bill Name" or null,
  "amount": 123.45 or null,
  "dueDate": "YYYY-MM-DD" or null,
  "category": "category_name" or null,
  "evidence": [
    {"field": "amount", "snippet": "quoted text from email showing amount", "source": "email_body"},
    {"field": "due_date", "snippet": "quoted text showing due date", "source": "email_body"}
  ],
  "confidence": {
    "overall": 0.85,
    "name": 0.9,
    "amount": 0.85,
    "dueDate": 0.8
  },
  "reasoning": "Brief explanation of your classification and extraction"
}`;
}

// ============================================================================
// Response Parser
// ============================================================================

interface AIRawResponse {
  isBill: boolean;
  name: string | null;
  amount: number | null;
  dueDate: string | null;
  category: string | null;
  evidence: Array<{
    field: string;
    snippet: string;
    source: string;
  }>;
  confidence: {
    overall: number;
    name: number;
    amount: number;
    dueDate: number;
  };
  reasoning: string;
}

/**
 * Parse and validate the AI response
 */
function parseAIResponse(responseText: string): AIRawResponse | null {
  try {
    // Find JSON in the response (handle markdown code blocks)
    let jsonStr = responseText;

    // Extract JSON from code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as AIRawResponse;

    // Validate required fields
    if (typeof parsed.isBill !== 'boolean') {
      return null;
    }

    return parsed;
  } catch {
    console.error('Failed to parse AI response:', responseText);
    return null;
  }
}

/**
 * Validate and normalize category
 */
function normalizeCategory(category: string | null): BillCategory | null {
  if (!category) return null;

  const validCategories: BillCategory[] = [
    'utilities', 'subscription', 'rent', 'housing', 'insurance',
    'phone', 'internet', 'credit_card', 'loan', 'health', 'other',
  ];

  const normalized = category.toLowerCase().replace(/[-\s]/g, '_');

  if (validCategories.includes(normalized as BillCategory)) {
    return normalized as BillCategory;
  }

  return 'other';
}

// ============================================================================
// Main Extraction Function
// ============================================================================

let anthropicClient: Anthropic | null = null;

/**
 * Get or create Anthropic client
 */
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

/**
 * Extract bill information using Claude AI
 */
export async function extractWithClaude(
  request: AIExtractionRequest
): Promise<AIExtractionResult> {
  const client = getAnthropicClient();

  // Debug: Log what we're sending to AI
  console.log('[AI Input]', JSON.stringify({
    subject: request.subject.substring(0, 80),
    bodyLen: request.cleanedBody.length,
    bodyPreview: request.cleanedBody.substring(0, 300),
    amounts: request.candidateAmounts.slice(0, 3).map(a => ({ value: a.value, context: a.context.substring(0, 40) })),
    dates: request.candidateDates.slice(0, 3).map(d => ({ value: d.value, context: d.context.substring(0, 40) })),
    names: request.candidateNames.slice(0, 2).map(n => n.value),
  }));

  try {
    const userPrompt = buildExtractionPrompt(request);

    const message = await client.messages.create({
      model: AI_CONFIG.model,
      max_tokens: AI_CONFIG.maxTokens,
      system: SYSTEM_PROMPT,
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

    const tokensUsed = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

    // Debug: Log AI response (more detail for debugging)
    console.log('[AI Response]', JSON.stringify({
      subject: request.subject.substring(0, 80),
      responseLen: responseText.length,
      responsePreview: responseText.substring(0, 800),
    }));

    // Parse the response
    const parsed = parseAIResponse(responseText);

    if (!parsed) {
      console.log('[AI Parse Failed]', responseText.substring(0, 300));
      return {
        isBill: false,
        name: null,
        amount: null,
        dueDate: null,
        category: null,
        evidence: [],
        confidence: {
          overall: 0,
          name: 0,
          amount: 0,
          dueDate: 0,
        },
        reasoning: 'Failed to parse AI response',
        tokensUsed,
      };
    }

    // Convert evidence to proper format
    const evidence: EvidenceSnippet[] = (parsed.evidence || []).map(e => ({
      field: e.field as 'name' | 'amount' | 'due_date' | 'category',
      snippet: e.snippet,
      source: e.source as 'email_subject' | 'email_body' | 'sender' | 'ai_extraction',
    }));

    return {
      isBill: parsed.isBill,
      name: parsed.name,
      amount: parsed.amount,
      dueDate: parsed.dueDate,
      category: normalizeCategory(parsed.category),
      evidence,
      confidence: {
        overall: Math.min(1, Math.max(0, parsed.confidence?.overall || 0)),
        name: Math.min(1, Math.max(0, parsed.confidence?.name || 0)),
        amount: Math.min(1, Math.max(0, parsed.confidence?.amount || 0)),
        dueDate: Math.min(1, Math.max(0, parsed.confidence?.dueDate || 0)),
      },
      reasoning: parsed.reasoning || '',
      tokensUsed,
    };
  } catch (error) {
    console.error('[AI Error]', {
      subject: request.subject.substring(0, 50),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.substring(0, 200) : undefined,
    });
    return {
      isBill: false,
      name: null,
      amount: null,
      dueDate: null,
      category: null,
      evidence: [],
      confidence: {
        overall: 0,
        name: 0,
        amount: 0,
        dueDate: 0,
      },
      reasoning: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract bill information using Claude Haiku (cheaper model)
 * Same logic as extractWithClaude but uses Haiku model
 */
export async function extractWithHaiku(
  request: AIExtractionRequest
): Promise<AIExtractionResult> {
  const client = getAnthropicClient();

  console.log('[Tier-2 Haiku] Processing:', {
    subject: request.subject.substring(0, 60),
    amounts: request.candidateAmounts.length,
    dates: request.candidateDates.length,
  });

  try {
    const userPrompt = buildExtractionPrompt(request);

    const message = await client.messages.create({
      model: AI_CONFIG_HAIKU.model,
      max_tokens: AI_CONFIG_HAIKU.maxTokens,
      system: SYSTEM_PROMPT,
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

    const tokensUsed = (message.usage?.input_tokens || 0) + (message.usage?.output_tokens || 0);

    // Parse the response
    const parsed = parseAIResponse(responseText);

    if (!parsed) {
      console.log('[Tier-2 Haiku] Parse failed');
      return {
        isBill: false,
        name: null,
        amount: null,
        dueDate: null,
        category: null,
        evidence: [],
        confidence: {
          overall: 0,
          name: 0,
          amount: 0,
          dueDate: 0,
        },
        reasoning: 'Failed to parse Haiku response',
        tokensUsed,
      };
    }

    // Convert evidence to proper format
    const evidence: EvidenceSnippet[] = (parsed.evidence || []).map(e => ({
      field: e.field as 'name' | 'amount' | 'due_date' | 'category',
      snippet: e.snippet,
      source: e.source as 'email_subject' | 'email_body' | 'sender' | 'ai_extraction',
    }));

    const result = {
      isBill: parsed.isBill,
      name: parsed.name,
      amount: parsed.amount,
      dueDate: parsed.dueDate,
      category: normalizeCategory(parsed.category),
      evidence,
      confidence: {
        overall: Math.min(1, Math.max(0, parsed.confidence?.overall || 0)),
        name: Math.min(1, Math.max(0, parsed.confidence?.name || 0)),
        amount: Math.min(1, Math.max(0, parsed.confidence?.amount || 0)),
        dueDate: Math.min(1, Math.max(0, parsed.confidence?.dueDate || 0)),
      },
      reasoning: parsed.reasoning || '',
      tokensUsed,
    };

    console.log('[Tier-2 Haiku] Result:', {
      confidence: result.confidence.overall,
      name: result.name,
      amount: result.amount,
    });

    return result;
  } catch (error) {
    console.error('[Tier-2 Haiku] Error:', error instanceof Error ? error.message : 'Unknown');
    return {
      isBill: false,
      name: null,
      amount: null,
      dueDate: null,
      category: null,
      evidence: [],
      confidence: {
        overall: 0,
        name: 0,
        amount: 0,
        dueDate: 0,
      },
      reasoning: `Haiku API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a mock extraction result for testing without API calls
 */
export function createMockExtraction(
  request: AIExtractionRequest
): AIExtractionResult {
  // Smart amount selection: prefer non-minimum amounts with positive keyword scores
  const nonMinimumAmounts = request.candidateAmounts.filter(a => !a.isMinimum);
  const positiveScoreAmounts = nonMinimumAmounts.filter(a => a.keywordScore > 0);

  // Pick best amount: positive score non-minimum > any non-minimum > first candidate
  const bestAmount = positiveScoreAmounts[0] ||
    nonMinimumAmounts[0] ||
    request.candidateAmounts[0];

  // Pick best date: highest keyword score
  const topDate = request.candidateDates[0];

  // Pick best name: highest confidence
  const topName = request.candidateNames[0];

  // Determine if this looks like a bill based on candidates
  // More lenient: just need amounts OR dates with good keyword scores
  const hasGoodAmounts = request.candidateAmounts.some(a => a.keywordScore > 0 && !a.isMinimum);
  const hasGoodDates = request.candidateDates.some(d => d.keywordScore > 0);
  const hasKnownSender = request.candidateNames.some(n => n.confidence >= 0.8);

  const isBill = (hasGoodAmounts || hasGoodDates) ||
    (hasKnownSender && (request.candidateAmounts.length > 0 || request.candidateDates.length > 0));

  return {
    isBill,
    name: topName?.value || null,
    amount: bestAmount?.value || null,
    dueDate: topDate?.value || null,
    category: topName?.category || null,
    evidence: [],
    confidence: {
      overall: isBill ? 0.7 : 0.1,
      name: topName ? 0.8 : 0,
      amount: bestAmount ? 0.8 : 0,
      dueDate: topDate ? 0.8 : 0,
    },
    reasoning: 'Mock extraction for testing',
  };
}

// ============================================================================
// TIER 1: Regex-Only Extraction (FREE)
// ============================================================================

/**
 * Check if sender email is from a known biller domain
 */
function isKnownBiller(email: string): boolean {
  const domainMatch = email.toLowerCase().match(/@([a-z0-9.-]+)$/);
  if (!domainMatch) return false;

  const domain = domainMatch[1];

  // Direct match
  if (KNOWN_BILLER_DOMAINS.has(domain)) return true;

  // Check if it's a subdomain of a known biller
  for (const knownDomain of KNOWN_BILLER_DOMAINS) {
    if (domain.endsWith('.' + knownDomain)) {
      return true;
    }
  }

  return false;
}

/**
 * Tier 1: Try to extract using ONLY regex + known billers (no AI)
 * Returns extraction result if confident enough, null otherwise
 */
export function tryRegexOnly(request: AIExtractionRequest): AIExtractionResult | null {
  const { from, candidateAmounts, candidateDates, candidateNames } = request;

  // Must be from a known biller domain
  if (!isKnownBiller(from)) {
    return null;
  }

  // Must have a name from regex patterns
  const topName = candidateNames[0];
  if (!topName) {
    return null;
  }

  // Must have high-confidence amount (score > 3, not minimum)
  const goodAmounts = candidateAmounts.filter(
    a => a.keywordScore > TIER_CONFIG.tier1KeywordThreshold && !a.isMinimum
  );
  if (goodAmounts.length === 0) {
    return null;
  }

  // Must have high-confidence date (score > 3)
  const goodDates = candidateDates.filter(
    d => d.keywordScore > TIER_CONFIG.tier1KeywordThreshold
  );
  if (goodDates.length === 0) {
    return null;
  }

  // All conditions met - return regex extraction with high confidence
  const bestAmount = goodAmounts[0];
  const bestDate = goodDates[0];

  console.log('[Tier-1 Regex] SUCCESS - Known biller + high keyword scores:', {
    from: from.substring(0, 40),
    name: topName.value,
    amount: bestAmount.value,
    amountScore: bestAmount.keywordScore,
    dueDate: bestDate.value,
    dateScore: bestDate.keywordScore,
  });

  return {
    isBill: true,
    name: topName.value,
    amount: bestAmount.value,
    dueDate: bestDate.value,
    category: topName.category ?? null,
    evidence: [
      {
        field: 'amount',
        snippet: bestAmount.context,
        source: 'email_body',
      },
      {
        field: 'due_date',
        snippet: bestDate.context,
        source: 'email_body',
      },
      {
        field: 'name',
        snippet: `Known biller: ${topName.value}`,
        source: 'sender',
      },
    ],
    confidence: {
      overall: TIER_CONFIG.tier1Confidence,
      name: topName.confidence,
      amount: 0.90,
      dueDate: 0.90,
    },
    reasoning: 'Tier 1: Known biller with high-confidence regex extraction (no AI used)',
    tokensUsed: 0, // No API call
  };
}

// ============================================================================
// TIERED EXTRACTION ORCHESTRATOR
// ============================================================================

export interface TieredExtractionResult extends AIExtractionResult {
  tier: 1 | 2 | 3;
  tierName: 'regex' | 'haiku' | 'sonnet';
  processingTimeMs: number;
}

/**
 * Tiered extraction: Try regex → Haiku → Sonnet in order
 * Falls back to more expensive tiers only when needed
 */
export async function extractTiered(
  request: AIExtractionRequest
): Promise<TieredExtractionResult> {
  const startTime = Date.now();

  // TIER 1: Try regex-only extraction (FREE)
  const tier1Result = tryRegexOnly(request);
  if (tier1Result) {
    const processingTimeMs = Date.now() - startTime;
    console.log(`[Tier-1 Regex] ✓ Used for "${request.subject.substring(0, 50)}" (${processingTimeMs}ms, $0)`);
    return {
      ...tier1Result,
      tier: 1,
      tierName: 'regex',
      processingTimeMs,
    };
  }

  console.log('[Tier-1 Regex] ✗ Conditions not met, trying Haiku...');

  // TIER 2: Try Haiku (cheap, fast)
  try {
    const tier2StartTime = Date.now();
    const tier2Result = await extractWithHaiku(request);
    const tier2ProcessingMs = Date.now() - tier2StartTime;

    // Accept Haiku result if confidence is high enough
    if (tier2Result.confidence.overall >= TIER_CONFIG.tier2ConfidenceThreshold) {
      const totalProcessingMs = Date.now() - startTime;
      console.log(`[Tier-2 Haiku] ✓ Used for "${request.subject.substring(0, 50)}" (${tier2ProcessingMs}ms, ~${tier2Result.tokensUsed} tokens)`);
      return {
        ...tier2Result,
        tier: 2,
        tierName: 'haiku',
        processingTimeMs: totalProcessingMs,
      };
    }

    console.log(`[Tier-2 Haiku] ✗ Confidence ${tier2Result.confidence.overall.toFixed(2)} < ${TIER_CONFIG.tier2ConfidenceThreshold}, falling back to Sonnet...`);
  } catch (error) {
    console.error('[Tier-2 Haiku] Error, falling back to Sonnet:', error instanceof Error ? error.message : 'Unknown');
  }

  // TIER 3: Sonnet (expensive, smart) - always used as final fallback
  try {
    const tier3StartTime = Date.now();
    const tier3Result = await extractWithClaude(request);
    const tier3ProcessingMs = Date.now() - tier3StartTime;
    const totalProcessingMs = Date.now() - startTime;

    console.log(`[Tier-3 Sonnet] ✓ Used for "${request.subject.substring(0, 50)}" (${tier3ProcessingMs}ms, ~${tier3Result.tokensUsed} tokens)`);

    return {
      ...tier3Result,
      tier: 3,
      tierName: 'sonnet',
      processingTimeMs: totalProcessingMs,
    };
  } catch (error) {
    // If Sonnet fails, return a failure result
    console.error('[Tier-3 Sonnet] FAILED:', error instanceof Error ? error.message : 'Unknown');
    const totalProcessingMs = Date.now() - startTime;

    return {
      isBill: false,
      name: null,
      amount: null,
      dueDate: null,
      category: null,
      evidence: [],
      confidence: {
        overall: 0,
        name: 0,
        amount: 0,
        dueDate: 0,
      },
      reasoning: `All tiers failed. Final error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      tokensUsed: 0,
      tier: 3,
      tierName: 'sonnet',
      processingTimeMs: totalProcessingMs,
    };
  }
}
