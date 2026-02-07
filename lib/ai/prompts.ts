/**
 * AI Prompts for Bill Extraction
 *
 * Single-email extraction prompt with skip detection and raw date extraction.
 */

import { BillCategory, RecurrenceInterval } from '@/types';
import { RawAIExtraction, EmailInput } from './types';

/**
 * System prompt for bill extraction
 */
export const BILL_EXTRACTION_SYSTEM_PROMPT = `You are an expert bill extraction assistant. Analyze emails and extract bill payment information.

IMPORTANT: Return the due date EXACTLY as written in the email (e.g., "January 25, 2026", "Jan 25", "01/25/26", "due in 5 days"). Do NOT convert to YYYY-MM-DD format.

## Response Format

Always respond with valid JSON only, no other text:

{
  "name": "string - specific product/account name",
  "amount": number | null,
  "due_date_raw": "string | null - EXACT text from email",
  "category": "utilities|subscription|rent|housing|insurance|phone|internet|credit_card|loan|health|other" | null,
  "is_recurring": boolean,
  "recurrence_interval": "weekly|biweekly|monthly|yearly" | null,
  "payment_url": "string | null - URL to pay the bill",
  "confidence": number (0-1),
  "skip": boolean,
  "skip_reason": "string | null - why email should be skipped"
}

## Skip Rules (set skip: true)

SKIP these emails:
- Payment confirmations/receipts ("Payment received", "Thank you for your payment", "Payment successful")
- Promotional offers, welcome bonuses, rewards offers
- Marketing newsletters
- Account alerts that aren't bills
- Balance updates without due date
- Credit score updates
- Transaction alerts
- Shipping/delivery notifications

## Extraction Rules

**name** - Be specific:
- Include product type: "Chase Ink Business", "Chase Auto", "Chase Sapphire"
- For auto loans: Include "Auto" (e.g., "Chase Auto", "Capital One Auto Finance")
- For mortgages: Include "Mortgage" (e.g., "Chase Mortgage")
- Look for card names in the body: "ink business", "sapphire", "freedom", "custom cash"

**amount** - Extract the CURRENT BILL amount (not account balance):
- PREFER: "Bill Amount", "Current Charges", "New Charges", "Amount Due", "Total Due"
- AVOID: "Balance", "Account Balance", "Total Balance" (these include past-due amounts)
- AVOID: Minimum payment amounts
- If email shows BOTH "Bill Amount" and "Balance", use "Bill Amount"
- Extract as number (142.50, not "$142.50")

**due_date_raw** - EXACT text from email:
- Copy exactly: "January 25, 2026", "Jan 25", "01/25/26", "due in 5 days"
- Do NOT modify or format the date
- Look for: "Due Date", "Payment Due", "Due by", "Due on", "Pay by"

**category**:
- utilities: Electric, gas, water, sewer
- subscription: Streaming, software, memberships
- credit_card: Credit cards, charge cards
- loan: Auto loans, mortgages, personal loans
- insurance: Auto, home, health, life insurance
- phone: Mobile, landline
- internet: Internet, cable, fiber
- rent/housing: Rent, property management
- health: Medical, dental, vision
- other: Anything else

**payment_url** - Extract the payment link:
- Look for: "Pay Now", "Pay Bill", "Make Payment", "Pay Online", "View and Pay", "Pay Your Bill" button/link URLs
- Extract the full URL (https://...)
- If no payment link found, return null`;

/**
 * Build the user prompt for a single email
 */
export function buildEmailPrompt(email: EmailInput): string {
  // Truncate body to avoid token limits
  const bodyTruncated = email.body.substring(0, 4000);

  return `Analyze this email and extract bill information:

From: ${email.from}
Subject: ${email.subject}

Body:
${bodyTruncated}

Remember:
1. If this is a payment confirmation, promotional email, or non-bill, set skip: true
2. Extract the SPECIFIC product name (not just company)
3. Copy due_date_raw EXACTLY as written in the email
4. Extract the TOTAL amount due (not minimum)

Respond with JSON only.`;
}

/**
 * Parse the AI response
 */
export function parseAIResponse(response: string): RawAIExtraction | null {
  try {
    // Clean markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const data = JSON.parse(cleaned);

    // Validate and normalize
    return {
      name: typeof data.name === 'string' ? data.name : 'Unknown Bill',
      amount: typeof data.amount === 'number' ? data.amount : null,
      due_date_raw: typeof data.due_date_raw === 'string' ? data.due_date_raw : null,
      category: isValidCategory(data.category) ? data.category : null,
      is_recurring: Boolean(data.is_recurring),
      recurrence_interval: isValidInterval(data.recurrence_interval)
        ? data.recurrence_interval
        : null,
      payment_url: typeof data.payment_url === 'string' ? data.payment_url : null,
      confidence:
        typeof data.confidence === 'number'
          ? Math.min(1, Math.max(0, data.confidence))
          : 0.5,
      skip: Boolean(data.skip),
      skip_reason: typeof data.skip_reason === 'string' ? data.skip_reason : null,
    };
  } catch (error) {
    console.error('[parseAIResponse] Failed to parse:', error);
    return null;
  }
}

// Validation helpers
function isValidCategory(category: unknown): category is BillCategory {
  const valid: BillCategory[] = [
    'utilities',
    'subscription',
    'rent',
    'housing',
    'insurance',
    'phone',
    'internet',
    'credit_card',
    'loan',
    'health',
    'other',
  ];
  return typeof category === 'string' && valid.includes(category as BillCategory);
}

function isValidInterval(interval: unknown): interval is RecurrenceInterval {
  const valid: RecurrenceInterval[] = ['weekly', 'biweekly', 'monthly', 'yearly'];
  return typeof interval === 'string' && valid.includes(interval as RecurrenceInterval);
}
