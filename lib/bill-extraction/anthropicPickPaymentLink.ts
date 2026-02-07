/**
 * AI-powered payment link selection using Claude
 *
 * Given a list of candidate payment links extracted from HTML,
 * Claude selects the most appropriate one for bill payment.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  AIPaymentLinkRequest,
  AIPaymentLinkResult,
  PaymentLinkCandidate,
} from './types';
import { PAYMENT_LINK_AI_CONFIG } from './constants';

// ============================================================================
// System Prompt
// ============================================================================

const PAYMENT_LINK_SYSTEM_PROMPT = `You are a payment link selector assistant. Your job is to select the best payment link from a list of candidates extracted from a bill email.

IMPORTANT RULES:
1. You may ONLY select from the provided candidate URLs - NEVER invent or modify URLs
2. Select the link most likely to lead directly to bill payment
3. Prefer "Pay Now" or "Make Payment" links over general account access links
4. Consider whether the link domain matches the expected vendor domain
5. If no suitable payment link exists, return null

SELECTION CRITERIA (in order of priority):
1. Direct payment action (e.g., "Pay Now", "Make Payment", "Pay Bill")
2. View and pay combined (e.g., "View and Pay Bill")
3. Payment setup (e.g., "Set Up AutoPay", "Schedule Payment")
4. Account access for payment (e.g., "Sign In to Pay", "My Account")

Always respond with valid JSON.`;

// ============================================================================
// Prompt Builder
// ============================================================================

function buildPaymentLinkPrompt(request: AIPaymentLinkRequest): string {
  const candidatesStr = request.candidates
    .map((c, i) => `${i + 1}. URL: ${c.url}
   Anchor Text: "${c.anchorText}"
   Domain: ${c.domain}
   Score: ${c.score}
   Context: "${c.context}"`)
    .join('\n\n');

  return `Select the best payment link for this bill.

BILL CONTEXT:
Vendor: ${request.vendorName || 'Unknown'}
Sender Domain: ${request.fromDomain}
Email Subject: ${request.subject}

CANDIDATE PAYMENT LINKS:
${candidatesStr}

INSTRUCTIONS:
1. Analyze each candidate link
2. Select the one most likely to be the direct payment URL
3. Consider if the domain is trustworthy and matches the vendor
4. Return the index (1-based) of your selection, or null if none are suitable

Respond with this exact JSON structure:
{
  "selectedIndex": 1 or null,
  "confidence": 0.85,
  "evidence": "Brief quote or description that supports this selection",
  "reasoning": "Explanation of why this link was selected"
}`;
}

// ============================================================================
// Response Parser
// ============================================================================

interface AIPaymentLinkRawResponse {
  selectedIndex: number | null;
  confidence: number;
  evidence: string;
  reasoning: string;
}

function parsePaymentLinkResponse(responseText: string): AIPaymentLinkRawResponse | null {
  try {
    let jsonStr = responseText;

    // Extract JSON from code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr) as AIPaymentLinkRawResponse;

    // Validate required fields
    if (typeof parsed.confidence !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    console.error('Failed to parse payment link AI response:', responseText);
    return null;
  }
}

// ============================================================================
// Main Selection Function
// ============================================================================

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
 * Use Claude to select the best payment link from candidates
 */
export async function pickPaymentLinkWithClaude(
  request: AIPaymentLinkRequest
): Promise<AIPaymentLinkResult> {
  // If no candidates, return null
  if (!request.candidates || request.candidates.length === 0) {
    return {
      paymentUrl: null,
      confidence: 0,
      evidence: '',
      reasoning: 'No payment link candidates provided',
    };
  }

  // If only one candidate with high score, skip AI call
  if (request.candidates.length === 1 && request.candidates[0].score >= 4) {
    const candidate = request.candidates[0];
    return {
      paymentUrl: candidate.url,
      confidence: 0.85,
      evidence: candidate.anchorText,
      reasoning: 'Single high-confidence candidate selected without AI',
    };
  }

  const client = getAnthropicClient();

  try {
    const userPrompt = buildPaymentLinkPrompt(request);

    const message = await client.messages.create({
      model: PAYMENT_LINK_AI_CONFIG.model,
      max_tokens: PAYMENT_LINK_AI_CONFIG.maxTokens,
      temperature: PAYMENT_LINK_AI_CONFIG.temperature,
      system: PAYMENT_LINK_SYSTEM_PROMPT,
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

    // Parse the response
    const parsed = parsePaymentLinkResponse(responseText);

    if (!parsed) {
      return {
        paymentUrl: null,
        confidence: 0,
        evidence: '',
        reasoning: 'Failed to parse AI response',
      };
    }

    // Validate selectedIndex is within range
    if (
      parsed.selectedIndex !== null &&
      (parsed.selectedIndex < 1 || parsed.selectedIndex > request.candidates.length)
    ) {
      return {
        paymentUrl: null,
        confidence: 0,
        evidence: '',
        reasoning: `Invalid selection index: ${parsed.selectedIndex}`,
      };
    }

    // Get the selected URL (convert from 1-based to 0-based index)
    const selectedUrl = parsed.selectedIndex !== null
      ? request.candidates[parsed.selectedIndex - 1].url
      : null;

    return {
      paymentUrl: selectedUrl,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      evidence: parsed.evidence || '',
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    console.error('Claude payment link selection error:', error);
    return {
      paymentUrl: null,
      confidence: 0,
      evidence: '',
      reasoning: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Create a mock payment link selection for testing without API calls
 */
export function createMockPaymentLinkSelection(
  candidates: PaymentLinkCandidate[]
): AIPaymentLinkResult {
  if (!candidates || candidates.length === 0) {
    return {
      paymentUrl: null,
      confidence: 0,
      evidence: '',
      reasoning: 'No candidates provided',
    };
  }

  // Select highest scoring candidate
  const best = candidates[0]; // Already sorted by score

  return {
    paymentUrl: best.url,
    confidence: best.score >= 4 ? 0.85 : 0.70,
    evidence: best.anchorText,
    reasoning: 'Mock selection: highest scoring candidate',
  };
}
