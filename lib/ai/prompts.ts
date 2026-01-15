// AI prompts for bill extraction from emails

import { BillCategory, RecurrenceInterval } from '@/types';

export interface ExtractedBillData {
  name: string;
  amount: number | null;
  due_date: string | null; // YYYY-MM-DD format
  category: BillCategory | null;
  is_recurring: boolean;
  recurrence_interval: RecurrenceInterval | null;
  confidence: number; // 0-1
}

export interface EmailForParsing {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
}

/**
 * System prompt for bill extraction
 */
export const BILL_EXTRACTION_SYSTEM_PROMPT = `You are a bill extraction assistant. Your job is to analyze emails and extract bill payment information.

Extract the following information from each email:
- **name**: The company or service name (e.g., "Netflix", "Duke Energy", "Comcast")
- **amount**: The total amount due as a number (e.g., 15.99, 142.50). If no amount found, use null.
- **due_date**: The payment due date in YYYY-MM-DD format. If no date found, use null.
- **category**: One of: utilities, subscription, rent, insurance, phone, internet, credit_card, loan, other
- **is_recurring**: true if this appears to be a recurring bill (monthly, weekly, etc.)
- **recurrence_interval**: If recurring, one of: weekly, monthly, yearly. Otherwise null.
- **confidence**: Your confidence score from 0 to 1 that this is a valid bill

Guidelines:
- Only extract if the email appears to be a bill, invoice, or payment reminder
- Look for keywords like "amount due", "total", "payment", "due date", "due by"
- For due dates, convert relative dates (e.g., "due in 7 days") to absolute YYYY-MM-DD format
- If the email is not a bill (e.g., promotional, receipt for completed payment), set confidence to 0
- Be conservative with confidence scores - only high confidence for clear bills

Respond ONLY with a valid JSON object, no other text.`;

/**
 * Build the user prompt for a single email
 */
export function buildEmailPrompt(email: EmailForParsing): string {
  return `Analyze this email and extract bill information:

Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}

Body:
${email.body.substring(0, 3000)}

Extract the bill information as JSON with these fields:
{
  "name": "string - company/service name",
  "amount": number | null,
  "due_date": "YYYY-MM-DD" | null,
  "category": "utilities|subscription|rent|insurance|phone|internet|credit_card|loan|other" | null,
  "is_recurring": boolean,
  "recurrence_interval": "weekly|monthly|yearly" | null,
  "confidence": number (0-1)
}`;
}

/**
 * Build the user prompt for batch email processing
 */
export function buildBatchEmailPrompt(emails: EmailForParsing[]): string {
  const emailList = emails
    .map(
      (email, index) => `
--- EMAIL ${index + 1} (ID: ${email.id}) ---
Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}
Body:
${email.body.substring(0, 1500)}
`
    )
    .join('\n');

  return `Analyze these emails and extract bill information from each:

${emailList}

For each email, provide a JSON object. Respond with a JSON array of extraction results:
[
  {
    "email_id": "string - the email ID",
    "name": "string - company/service name",
    "amount": number | null,
    "due_date": "YYYY-MM-DD" | null,
    "category": "utilities|subscription|rent|insurance|phone|internet|credit_card|loan|other" | null,
    "is_recurring": boolean,
    "recurrence_interval": "weekly|monthly|yearly" | null,
    "confidence": number (0-1)
  },
  ...
]

Only include emails that appear to be bills (confidence > 0.3). Skip promotional emails or receipts.`;
}

/**
 * Parse the AI response for a single email
 */
export function parseAIResponse(response: string): ExtractedBillData | null {
  try {
    // Clean the response - remove markdown code blocks if present
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

    // Validate and normalize the response
    return {
      name: typeof data.name === 'string' ? data.name : 'Unknown Bill',
      amount: typeof data.amount === 'number' ? data.amount : null,
      due_date: isValidDate(data.due_date) ? data.due_date : null,
      category: isValidCategory(data.category) ? data.category : null,
      is_recurring: Boolean(data.is_recurring),
      recurrence_interval: isValidInterval(data.recurrence_interval)
        ? data.recurrence_interval
        : null,
      confidence: typeof data.confidence === 'number' ? Math.min(1, Math.max(0, data.confidence)) : 0.5,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return null;
  }
}

/**
 * Parse the AI response for batch emails
 */
export function parseBatchAIResponse(
  response: string
): Array<ExtractedBillData & { email_id: string }> {
  try {
    // Clean the response
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

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        email_id: String(item.email_id || ''),
        name: typeof item.name === 'string' ? item.name : 'Unknown Bill',
        amount: typeof item.amount === 'number' ? item.amount : null,
        due_date: isValidDate(item.due_date) ? item.due_date : null,
        category: isValidCategory(item.category) ? item.category : null,
        is_recurring: Boolean(item.is_recurring),
        recurrence_interval: isValidInterval(item.recurrence_interval)
          ? item.recurrence_interval
          : null,
        confidence:
          typeof item.confidence === 'number'
            ? Math.min(1, Math.max(0, item.confidence))
            : 0.5,
      }))
      .filter((item) => item.confidence >= 0.3);
  } catch (error) {
    console.error('Failed to parse batch AI response:', error);
    return [];
  }
}

// Validation helpers
function isValidDate(date: unknown): date is string {
  if (typeof date !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

function isValidCategory(category: unknown): category is BillCategory {
  const valid: BillCategory[] = [
    'utilities',
    'subscription',
    'rent',
    'insurance',
    'phone',
    'internet',
    'credit_card',
    'loan',
    'other',
  ];
  return typeof category === 'string' && valid.includes(category as BillCategory);
}

function isValidInterval(interval: unknown): interval is RecurrenceInterval {
  const valid: RecurrenceInterval[] = ['weekly', 'monthly', 'yearly'];
  return typeof interval === 'string' && valid.includes(interval as RecurrenceInterval);
}
