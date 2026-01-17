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
export const BILL_EXTRACTION_SYSTEM_PROMPT = `You are an expert bill extraction assistant. Your job is to CAREFULLY analyze email content and extract accurate bill payment information.

## CRITICAL: Read the ENTIRE email body carefully before extracting data.

### FIELD EXTRACTION RULES:

**name** (VERY IMPORTANT - Be Specific!):
- Extract the SPECIFIC product or account name, not just the company name
- For credit cards: Include the card type (e.g., "Chase Ink Business", "Chase Sapphire", "Chase Auto", "Citi Custom Cash", "Capital One Venture")
- For auto loans: Include "Auto" in the name (e.g., "Chase Auto", "Capital One Auto Finance")
- For mortgages: Include "Mortgage" (e.g., "Chase Mortgage", "Wells Fargo Mortgage")
- Look for keywords in the email body: "auto account", "ink business", "sapphire", "freedom", "custom cash", etc.
- The subject line and body often contain the specific product name - USE IT

**amount** (Extract the TOTAL due, not minimum):
- Look for: "Total Due", "Statement Balance", "New Balance", "Amount Due", "Current Balance", "Payment Amount"
- AVOID minimum payment amounts - these are usually much smaller
- Extract as a number (e.g., 142.50, not "$142.50")
- If multiple amounts exist, prefer the larger "total" or "statement balance" amount

**due_date** (Be thorough in finding dates):
- Look for: "Due Date", "Payment Due", "Due by", "Due on", "Pay by", "Payment Date", "Scheduled for"
- Common formats: "01/20/2026", "January 20, 2026", "Jan 20", "due on Feb 2"
- Convert ALL dates to YYYY-MM-DD format
- If no year specified, use the current year (or next year if the date would be in the past)
- For "due in X days", calculate the actual date

**category**:
- utilities: Electric, gas, water, sewer
- subscription: Streaming, software, memberships
- credit_card: Credit cards, charge cards
- loan: Auto loans, mortgages, personal loans, student loans
- insurance: Auto, home, health, life insurance
- phone: Mobile, landline
- internet: Internet, cable, fiber
- rent: Rent, property management
- other: Anything else

### EXAMPLES:

Email with "Your auto account statement is available" from Chase:
- name: "Chase Auto" (NOT just "Chase")
- category: "loan" (NOT "credit_card")

Email with "Your Ink Business Cash Visa automatic payment":
- name: "Chase Ink Business" (NOT just "Chase")
- category: "credit_card"

Email with "Citi Custom Cash" in subject:
- name: "Citi Custom Cash" (NOT just "Citi")

### SKIP THESE EMAILS (confidence = 0):
- Promotional offers, welcome bonuses, rewards offers
- Payment confirmation/receipt (payment already made)
- Marketing newsletters
- Account alerts that aren't bills

Respond ONLY with a valid JSON object, no other text.`;

/**
 * Build the user prompt for a single email
 */
export function buildEmailPrompt(email: EmailForParsing): string {
  return `CAREFULLY analyze this email and extract bill information:

Subject: ${email.subject}
From: ${email.from}
Date: ${email.date}

Body:
${email.body.substring(0, 3000)}

IMPORTANT INSTRUCTIONS:
1. Read the ENTIRE body carefully to find the specific product/account name
2. Look for keywords like "auto account", "ink business", "custom cash", "sapphire", etc.
3. Find the TOTAL amount due (not minimum payment)
4. Find the exact due date and convert to YYYY-MM-DD format

Extract as JSON:
{
  "name": "SPECIFIC product name (e.g., 'Chase Auto', 'Chase Ink Business', NOT just 'Chase')",
  "amount": number | null (total due, not minimum),
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

  return `CAREFULLY analyze these emails and extract bill information from each:

${emailList}

CRITICAL INSTRUCTIONS FOR EACH EMAIL:
1. Read the ENTIRE body to find the SPECIFIC product/account name
   - "auto account" = Chase Auto (category: loan)
   - "ink business" = Chase Ink Business (category: credit_card)
   - "custom cash" = Citi Custom Cash
   - Look for card names like Sapphire, Freedom, Venture, etc.
2. Extract the TOTAL amount due (look for "Total Due", "Statement Balance", "Amount Due")
3. Find the due date (look for "Due Date", "Due on", "Payment Due", "Pay by")
4. Convert all dates to YYYY-MM-DD format

Respond with a JSON array:
[
  {
    "email_id": "string - the email ID",
    "name": "SPECIFIC product name (e.g., 'Chase Auto', NOT just 'Chase')",
    "amount": number | null (total due, NOT minimum payment),
    "due_date": "YYYY-MM-DD" | null,
    "category": "utilities|subscription|rent|insurance|phone|internet|credit_card|loan|other" | null,
    "is_recurring": boolean,
    "recurrence_interval": "weekly|monthly|yearly" | null,
    "confidence": number (0-1)
  }
]

Only include actual bills (confidence > 0.3). Skip promotional emails and payment receipts.`;
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
