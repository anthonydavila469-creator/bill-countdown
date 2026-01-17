/**
 * Rule-based bill detection from email content
 * Extracts bill information using keyword matching and regex patterns
 */

import { BillCategory, BillSuggestion, EmailData, Bill } from '@/types';

// Keywords that indicate an email is promotional/marketing (NOT a bill)
export const PROMOTIONAL_KEYWORDS = [
  'offer awaits',
  'welcome offer',
  'special offer',
  'limited time',
  'exclusive offer',
  'discount',
  'coupon',
  'promo code',
  'promocode',
  '% off',
  'off your',
  'deal',
  'sale',
  'flash sale',
  'clearance',
  'free shipping',
  'free gift',
  'earn rewards',
  'bonus points',
  'cashback',
  'cash back',
  'redeem',
  'claim your',
  'don\'t miss',
  'act now',
  'hurry',
  'expires soon',
  'last chance',
  'still thinking',
  'left in cart',
  'cart reminder',
  'forgot something',
  'come back',
  'we miss you',
  'unsubscribe',
  'marketing',
  'newsletter',
  'weekly deals',
  'daily deals',
  'price drop',
  'save up to',
  'buy now',
  'shop now',
  'order now',
];

// Keywords that indicate an email is NOT a bill (cancellations, confirmations, etc.)
export const SKIP_KEYWORDS = [
  'you canceled',
  'you cancelled',
  'payment canceled',
  'payment cancelled',
  'autopay canceled',
  'autopay cancelled',
  'automatic payment canceled',
  'automatic payment cancelled',
  'cancellation confirmed',
  'successfully canceled',
  'successfully cancelled',
  'payment received',
  'payment successful',
  'thank you for your payment',
  'payment confirmation',
  'payment processed',
  'we received your payment',
  'your payment has been',
  'transaction complete',
  'paid in full',
];

// Keywords that indicate an email is likely a bill
export const BILL_KEYWORDS = {
  high: [
    'amount due',
    'payment due',
    'bill is ready',
    'your bill',
    'invoice',
    'statement ready',
    'pay now',
    'due date',
    'minimum payment',
    'account balance',
    'total due',
    'balance due',
  ],
  medium: [
    'billing statement',
    'payment reminder',
    'autopay',
    'auto-pay',
    'scheduled payment',
    'payment confirmation',
    'monthly statement',
    'your statement',
    'payment notice',
    'upcoming payment',
  ],
  low: [
    'account',
    'billing',
    'payment',
    'subscription',
    'renewal',
    'charged',
    'transaction',
  ],
};

// Sender patterns that map to bill categories
export const SENDER_PATTERNS: Array<{ pattern: RegExp; category: BillCategory; name?: string }> = [
  // Utilities
  { pattern: /electric|power|energy|pge|sce|duke energy|con edison/i, category: 'utilities', name: 'Electric' },
  { pattern: /gas|socalgas|national grid/i, category: 'utilities', name: 'Gas' },
  { pattern: /water|sewer|municipal/i, category: 'utilities', name: 'Water' },

  // Subscriptions
  { pattern: /netflix/i, category: 'subscription', name: 'Netflix' },
  { pattern: /spotify/i, category: 'subscription', name: 'Spotify' },
  { pattern: /hulu/i, category: 'subscription', name: 'Hulu' },
  { pattern: /disney\+|disneyplus/i, category: 'subscription', name: 'Disney+' },
  { pattern: /hbo|max\.com/i, category: 'subscription', name: 'Max' },
  { pattern: /amazon prime|primevideo/i, category: 'subscription', name: 'Amazon Prime' },
  { pattern: /apple\s?(tv|music|one|arcade)/i, category: 'subscription', name: 'Apple' },
  { pattern: /youtube\s?(premium|music)/i, category: 'subscription', name: 'YouTube Premium' },
  { pattern: /paramount/i, category: 'subscription', name: 'Paramount+' },
  { pattern: /peacock/i, category: 'subscription', name: 'Peacock' },
  { pattern: /audible/i, category: 'subscription', name: 'Audible' },
  { pattern: /adobe/i, category: 'subscription', name: 'Adobe' },
  { pattern: /microsoft\s?365|office\s?365/i, category: 'subscription', name: 'Microsoft 365' },
  { pattern: /dropbox/i, category: 'subscription', name: 'Dropbox' },
  { pattern: /icloud/i, category: 'subscription', name: 'iCloud' },
  { pattern: /google\s?(one|storage|workspace)/i, category: 'subscription', name: 'Google One' },
  { pattern: /openai|chatgpt/i, category: 'subscription', name: 'OpenAI' },
  { pattern: /anthropic|claude/i, category: 'subscription', name: 'Anthropic' },
  { pattern: /gym|fitness|planet fitness|la fitness|equinox|24 hour/i, category: 'subscription', name: 'Gym' },

  // Insurance
  { pattern: /geico/i, category: 'insurance', name: 'GEICO' },
  { pattern: /progressive/i, category: 'insurance', name: 'Progressive' },
  { pattern: /state farm/i, category: 'insurance', name: 'State Farm' },
  { pattern: /allstate/i, category: 'insurance', name: 'Allstate' },
  { pattern: /liberty mutual/i, category: 'insurance', name: 'Liberty Mutual' },
  { pattern: /farmers insurance/i, category: 'insurance', name: 'Farmers' },
  { pattern: /usaa/i, category: 'insurance', name: 'USAA' },
  { pattern: /insurance|insur/i, category: 'insurance' },

  // Phone
  { pattern: /verizon/i, category: 'phone', name: 'Verizon' },
  { pattern: /at&t|att\.com/i, category: 'phone', name: 'AT&T' },
  { pattern: /t-mobile|tmobile/i, category: 'phone', name: 'T-Mobile' },
  { pattern: /sprint/i, category: 'phone', name: 'Sprint' },
  { pattern: /mint mobile/i, category: 'phone', name: 'Mint Mobile' },
  { pattern: /visible/i, category: 'phone', name: 'Visible' },
  { pattern: /cricket/i, category: 'phone', name: 'Cricket' },

  // Internet
  { pattern: /comcast|xfinity/i, category: 'internet', name: 'Xfinity' },
  { pattern: /spectrum/i, category: 'internet', name: 'Spectrum' },
  { pattern: /cox\s?communications/i, category: 'internet', name: 'Cox' },
  { pattern: /frontier/i, category: 'internet', name: 'Frontier' },
  { pattern: /centurylink/i, category: 'internet', name: 'CenturyLink' },
  { pattern: /optimum|altice/i, category: 'internet', name: 'Optimum' },
  { pattern: /google fiber/i, category: 'internet', name: 'Google Fiber' },
  { pattern: /starlink/i, category: 'internet', name: 'Starlink' },

  // Credit Cards
  { pattern: /chase/i, category: 'credit_card', name: 'Chase' },
  { pattern: /american express|amex/i, category: 'credit_card', name: 'American Express' },
  { pattern: /capital one/i, category: 'credit_card', name: 'Capital One' },
  { pattern: /discover/i, category: 'credit_card', name: 'Discover' },
  { pattern: /citi|citibank/i, category: 'credit_card', name: 'Citi' },
  { pattern: /bank of america/i, category: 'credit_card', name: 'Bank of America' },
  { pattern: /wells fargo/i, category: 'credit_card', name: 'Wells Fargo' },
  { pattern: /synchrony/i, category: 'credit_card', name: 'Synchrony' },
  { pattern: /barclays/i, category: 'credit_card', name: 'Barclays' },

  // Loans
  { pattern: /student loan|navient|nelnet|mohela|aidvantage|fedloan/i, category: 'loan', name: 'Student Loan' },
  { pattern: /mortgage|home loan/i, category: 'loan', name: 'Mortgage' },
  { pattern: /auto loan|car payment/i, category: 'loan', name: 'Auto Loan' },
  { pattern: /sofi/i, category: 'loan', name: 'SoFi' },

  // Rent
  { pattern: /rent|landlord|property management|apartment/i, category: 'rent' },
];

// Product refinement patterns - used to distinguish specific products from same company
// These are checked against full email content (subject + body) to refine generic names
export const PRODUCT_REFINEMENT_PATTERNS: Array<{ baseName: string; pattern: RegExp; refinedName: string; category?: BillCategory }> = [
  // Chase products
  { baseName: 'Chase', pattern: /auto\s*(?:account|loan|payment|statement)/i, refinedName: 'Chase Auto', category: 'loan' },
  { baseName: 'Chase', pattern: /ink\s*business/i, refinedName: 'Chase Ink Business' },
  { baseName: 'Chase', pattern: /sapphire\s*(?:preferred|reserve)?/i, refinedName: 'Chase Sapphire' },
  { baseName: 'Chase', pattern: /freedom\s*(?:flex|unlimited)?/i, refinedName: 'Chase Freedom' },
  { baseName: 'Chase', pattern: /slate/i, refinedName: 'Chase Slate' },
  { baseName: 'Chase', pattern: /amazon.*card|card.*amazon/i, refinedName: 'Chase Amazon' },
  { baseName: 'Chase', pattern: /united.*card|card.*united/i, refinedName: 'Chase United' },
  { baseName: 'Chase', pattern: /southwest.*card|card.*southwest/i, refinedName: 'Chase Southwest' },
  { baseName: 'Chase', pattern: /marriott.*card|card.*marriott/i, refinedName: 'Chase Marriott' },
  { baseName: 'Chase', pattern: /mortgage|home\s*loan/i, refinedName: 'Chase Mortgage', category: 'loan' },
  { baseName: 'Chase', pattern: /checking|savings|bank\s*account/i, refinedName: 'Chase Bank' },

  // Capital One products
  { baseName: 'Capital One', pattern: /venture/i, refinedName: 'Capital One Venture' },
  { baseName: 'Capital One', pattern: /quicksilver/i, refinedName: 'Capital One Quicksilver' },
  { baseName: 'Capital One', pattern: /savor/i, refinedName: 'Capital One Savor' },
  { baseName: 'Capital One', pattern: /auto\s*(?:loan|payment|finance)/i, refinedName: 'Capital One Auto', category: 'loan' },

  // Citi products
  { baseName: 'Citi', pattern: /custom\s*cash/i, refinedName: 'Citi Custom Cash' },
  { baseName: 'Citi', pattern: /double\s*cash/i, refinedName: 'Citi Double Cash' },
  { baseName: 'Citi', pattern: /strata\s*premier/i, refinedName: 'Citi Strata Premier' },
  { baseName: 'Citi', pattern: /premier(?!\s*miles)/i, refinedName: 'Citi Premier' },
  { baseName: 'Citi', pattern: /rewards\+|rewards\s*plus/i, refinedName: 'Citi Rewards+' },
  { baseName: 'Citi', pattern: /simplicity/i, refinedName: 'Citi Simplicity' },
  { baseName: 'Citi', pattern: /diamond\s*preferred/i, refinedName: 'Citi Diamond Preferred' },
  { baseName: 'Citi', pattern: /costco/i, refinedName: 'Citi Costco' },
  { baseName: 'Citi', pattern: /aadvantage|american\s*airlines/i, refinedName: 'Citi AAdvantage' },
  { baseName: 'Citi', pattern: /thankyou\s*(?:preferred|points)?/i, refinedName: 'Citi ThankYou' },
  { baseName: 'Citi', pattern: /secured/i, refinedName: 'Citi Secured' },
  { baseName: 'Citi', pattern: /flex\s*pay/i, refinedName: 'Citi Flex Pay' },
  { baseName: 'Citi', pattern: /best\s*buy/i, refinedName: 'Citi Best Buy' },
  { baseName: 'Citi', pattern: /home\s*depot/i, refinedName: 'Citi Home Depot' },

  // American Express products
  { baseName: 'American Express', pattern: /platinum/i, refinedName: 'Amex Platinum' },
  { baseName: 'American Express', pattern: /gold\s*card/i, refinedName: 'Amex Gold' },
  { baseName: 'American Express', pattern: /blue\s*cash/i, refinedName: 'Amex Blue Cash' },
  { baseName: 'American Express', pattern: /everyday/i, refinedName: 'Amex EveryDay' },
  { baseName: 'American Express', pattern: /delta/i, refinedName: 'Amex Delta' },
  { baseName: 'American Express', pattern: /hilton/i, refinedName: 'Amex Hilton' },

  // Bank of America products
  { baseName: 'Bank of America', pattern: /customized\s*cash/i, refinedName: 'BofA Customized Cash' },
  { baseName: 'Bank of America', pattern: /travel\s*rewards/i, refinedName: 'BofA Travel Rewards' },
  { baseName: 'Bank of America', pattern: /unlimited\s*cash/i, refinedName: 'BofA Unlimited Cash' },

  // Discover products
  { baseName: 'Discover', pattern: /it\s*card|discover\s*it/i, refinedName: 'Discover it' },
  { baseName: 'Discover', pattern: /miles/i, refinedName: 'Discover Miles' },
];

// Patterns for TOTAL/FULL amounts (preferred)
export const TOTAL_AMOUNT_PATTERNS = [
  /(?:total\s*(?:due|balance|amount|owed)?|statement\s*balance|new\s*balance|current\s*balance|amount\s*due|balance\s*due)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
  /\$\s*([\d,]+\.?\d{0,2})\s*(?:total|due|owed|balance)/gi,
  // "Payment Amount: $100.00" or "Payment: $100.00"
  /payment\s*(?:amount)?[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
  // "Current Account Balance $64.00"
  /current\s*account\s*balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
];

// Patterns for MINIMUM amounts (to be avoided/deprioritized)
export const MINIMUM_AMOUNT_PATTERNS = [
  /(?:minimum|min\.?)\s*(?:payment|due|amount)?[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
  /\$\s*([\d,]+\.?\d{0,2})\s*(?:minimum|min)/gi,
];

// General amount patterns (fallback)
export const AMOUNT_PATTERNS = [
  /\$\s*([\d,]+\.?\d{0,2})/g, // $XX.XX or $X,XXX.XX
  /(?:amount|total|due|balance|payment)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi, // "Amount: $XX.XX"
  /(?:USD|US\$)\s*([\d,]+\.?\d{0,2})/gi, // USD XX.XX
];

// Month names for date parsing
const MONTH_NAMES = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

// Regex patterns to extract due dates (ordered by specificity - most specific first)
export const DATE_PATTERNS = [
  // HIGH PRIORITY: Explicit "due" patterns
  // "Due: January 15, 2024" or "Due Date: 01/15/2024" or "due on Feb 2"
  new RegExp(`(?:due|payment)\\s*(?:date|on)?[:\\s]*?(${MONTH_NAMES}\\s+\\d{1,2},?\\s*\\d{4}|\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})`, 'gi'),

  // "due on January 15" or "due on 01/15" or "Due On: Feb 2"
  new RegExp(`due\\s+on[:\\s]*?(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)`, 'gi'),

  // "Due Feb 13" or "Due 02/13" (short form, very common)
  new RegExp(`\\bdue\\s+(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)`, 'gi'),

  // "Payment Date: 01/20/2026" or "Payment Due: Feb 2"
  new RegExp(`payment\\s*(?:date|due)?[:\\s]+(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}|${MONTH_NAMES}\\s+\\d{1,2},?\\s*\\d{4}?)`, 'gi'),

  // "by January 15" or "by 01/15" or "before January 15"
  new RegExp(`(?:by|before)\\s+(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)`, 'gi'),

  // "scheduled for January 15" or "scheduled on 01/15"
  new RegExp(`scheduled\\s+(?:for|on)\\s+(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)`, 'gi'),

  // "debit date: 01/20/2026" or "draft date: 01/20/2026" or "Auto Pay: Feb 2"
  new RegExp(`(?:debit|draft|withdrawal|auto\\s*pay)\\s*(?:date)?[:\\s]+(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}|${MONTH_NAMES}\\s+\\d{1,2},?\\s*\\d{4}?)`, 'gi'),

  // "due in X days"
  /due\s+in\s+(\d+)\s+days?/gi,

  // MEDIUM PRIORITY: Date near dollar amount (common in utility bills)
  // "$136.87 Feb 13" or "$136.87 02/13/2026"
  new RegExp(`\\$[\\d,]+\\.?\\d*\\s+(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})`, 'gi'),

  // "Feb 13 $136.87" or "02/13/2026 $136.87"
  new RegExp(`(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})\\s+\\$[\\d,]+\\.?\\d*`, 'gi'),

  // "on January 15, 2026" (standalone with year)
  new RegExp(`\\bon\\s+(${MONTH_NAMES}\\s+\\d{1,2},\\s*\\d{4})`, 'gi'),

  // LOW PRIORITY: Standalone dates (use as fallback)
  // "January 15, 2026" or "Jan 15, 2026" at word boundary
  new RegExp(`\\b(${MONTH_NAMES}\\s+\\d{1,2},?\\s+\\d{4})\\b`, 'gi'),

  // "01/15/2026" or "1/15/26" - MM/DD/YYYY format
  /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
];

/**
 * Extract merchant/company name from email sender, subject, and body
 * Uses product refinement patterns to distinguish specific products (e.g., Chase Auto vs Chase Ink)
 */
export function extractMerchantName(from: string, subject: string, body: string = ''): string {
  const fullText = `${subject} ${body}`;
  let baseName: string | null = null;

  // First, try to match against known sender patterns to get base name
  for (const { pattern, name } of SENDER_PATTERNS) {
    if (name && (pattern.test(from) || pattern.test(subject))) {
      baseName = name;
      break;
    }
  }

  // If we found a base name, try to refine it using product-specific patterns
  if (baseName) {
    for (const { baseName: base, pattern, refinedName } of PRODUCT_REFINEMENT_PATTERNS) {
      if (baseName === base && pattern.test(fullText)) {
        return refinedName;
      }
    }
    return baseName;
  }

  // Extract name from email address (e.g., "billing@netflix.com" -> "Netflix")
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s@]+@[^\s@]+)/);
  if (emailMatch) {
    const email = emailMatch[1];
    const domain = email.split('@')[1]?.split('.')[0];
    if (domain && domain.length > 2) {
      // Capitalize first letter
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
  }

  // Extract from "Name <email>" format
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    // Remove common prefixes/suffixes
    const cleaned = name
      .replace(/billing|noreply|no-reply|notifications?|support/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length > 1) {
      return cleaned;
    }
  }

  // Fallback: use first word of subject (often the company name)
  const subjectWords = subject.split(/[\s:,\-]+/);
  const firstWord = subjectWords.find(w => w.length > 2 && !/your|the|a|an|is|for/i.test(w));
  if (firstWord) {
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }

  return 'Unknown Bill';
}

/**
 * Check if an amount looks like a real bill amount (not a zip code, account number, etc.)
 */
function isReasonableBillAmount(amount: number, hasDecimal: boolean): boolean {
  // Bills are typically between $1 and $5000
  // Amounts over $5000 without decimals are suspicious (could be zip codes, etc.)
  if (amount < 1) return false;
  if (amount > 10000) return false; // Very few bills are over $10k
  if (amount > 5000 && !hasDecimal) return false; // Large round numbers are suspicious
  if (amount > 1000 && amount === Math.floor(amount) && amount % 100 === 1) {
    // Looks like a zip code (10001, 20001, etc.)
    return false;
  }
  return true;
}

/**
 * Extract dollar amounts from text, preferring total/statement balance over minimum payment
 */
export function extractAmount(text: string): number | null {
  // Helper to extract amounts from patterns
  const extractFromPatterns = (patterns: RegExp[], maxAmount: number = 10000): number[] => {
    const amounts: number[] = [];
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        const hasDecimal = amountStr.includes('.');

        if (!isNaN(amount) && isReasonableBillAmount(amount, hasDecimal) && amount <= maxAmount) {
          amounts.push(amount);
        }
      }
    }
    return amounts;
  };

  // First, try to find TOTAL/STATEMENT amounts (preferred) - these are more reliable
  const totalAmounts = extractFromPatterns(TOTAL_AMOUNT_PATTERNS, 10000);
  if (totalAmounts.length > 0) {
    // Prefer amounts with decimals, then largest
    const withDecimals = totalAmounts.filter(a => a !== Math.floor(a));
    if (withDecimals.length > 0) {
      return Math.max(...withDecimals);
    }
    return Math.max(...totalAmounts.filter(a => a >= 1)) || totalAmounts[0];
  }

  // Get minimum amounts to exclude them from general search
  const minimumAmounts = new Set(extractFromPatterns(MINIMUM_AMOUNT_PATTERNS, 1000));

  // Fall back to general patterns, but with stricter validation
  // Use lower max for general patterns since they're less reliable
  const generalAmounts = extractFromPatterns(AMOUNT_PATTERNS, 5000);
  const filteredAmounts = generalAmounts.filter(a => !minimumAmounts.has(a) && a >= 1);

  if (filteredAmounts.length > 0) {
    // Prefer amounts with decimals (real bill amounts usually have cents)
    const withDecimals = filteredAmounts.filter(a => a !== Math.floor(a));
    if (withDecimals.length > 0) {
      return Math.max(...withDecimals);
    }
    // If no decimals, prefer smaller amounts (less likely to be errors)
    return Math.min(...filteredAmounts);
  }

  // If all amounts are minimum amounts, return the largest one anyway
  if (generalAmounts.length > 0) {
    const validAmounts = generalAmounts.filter(a => a >= 1 && a < 2000);
    return validAmounts.length > 0 ? Math.max(...validAmounts) : null;
  }

  return null;
}

/**
 * Extract due dates from text - tries all patterns and picks the best date
 */
export function extractDueDate(text: string): string | null {
  const candidates: Array<{ date: string; priority: number }> = [];

  // Try each pattern, tracking priority (earlier patterns = higher priority)
  for (let i = 0; i < DATE_PATTERNS.length; i++) {
    const pattern = DATE_PATTERNS[i];
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    // Find all matches for this pattern
    while ((match = regex.exec(text)) !== null) {
      const dateStr = match[1];

      // Handle "due in X days"
      if (/^\d+$/.test(dateStr)) {
        const days = parseInt(dateStr);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        candidates.push({
          date: dueDate.toISOString().split('T')[0],
          priority: i,
        });
        continue;
      }

      // Try to parse the date string
      const parsed = parseDate(dateStr);
      if (parsed) {
        candidates.push({ date: parsed, priority: i });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort candidates: prefer higher priority (lower index), then future dates closest to today
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  candidates.sort((a, b) => {
    // First, prefer high-priority patterns (lower index = higher priority)
    const priorityDiff = a.priority - b.priority;
    if (Math.abs(priorityDiff) > 5) {
      // Only consider priority if there's a significant difference
      return priorityDiff;
    }

    // Then prefer future dates
    const aIsFuture = a.date >= today;
    const bIsFuture = b.date >= today;
    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;

    // Both future or both past: prefer closest to today
    const aDiff = Math.abs(new Date(a.date).getTime() - now.getTime());
    const bDiff = Math.abs(new Date(b.date).getTime() - now.getTime());
    return aDiff - bDiff;
  });

  return candidates[0].date;
}

/**
 * Parse various date formats into YYYY-MM-DD
 */
function parseDate(dateStr: string): string | null {
  const currentYear = new Date().getFullYear();
  const now = new Date();

  // Clean up the date string
  let cleaned = dateStr.trim().replace(/,/g, '');

  // Month name to number mapping
  const monthMap: Record<string, number> = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'sept': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11,
  };

  let date: Date | null = null;

  // Try to parse "Feb 13" or "February 13" or "Feb 13 2026" patterns
  const monthNameMatch = cleaned.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/i);
  if (monthNameMatch) {
    const monthName = monthNameMatch[1].toLowerCase();
    const day = parseInt(monthNameMatch[2]);
    const year = monthNameMatch[3] ? parseInt(monthNameMatch[3]) : currentYear;

    if (monthMap[monthName] !== undefined && day >= 1 && day <= 31) {
      date = new Date(year, monthMap[monthName], day);
    }
  }

  // Try MM/DD/YYYY or MM-DD-YYYY or MM/DD/YY format
  if (!date || isNaN(date.getTime())) {
    const slashMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1]) - 1;
      const day = parseInt(slashMatch[2]);
      let year = slashMatch[3] ? parseInt(slashMatch[3]) : currentYear;

      // Handle 2-digit years
      if (year < 100) {
        year = year >= 50 ? 1900 + year : 2000 + year;
      }

      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        date = new Date(year, month, day);
      }
    }
  }

  // Try built-in Date parsing as fallback
  if (!date || isNaN(date.getTime())) {
    date = new Date(cleaned);
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
      date = new Date(`${cleaned} ${currentYear}`);
    }
  }

  if (!date || isNaN(date.getTime())) return null;

  // If date is more than 30 days in the past, assume next year
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (date < thirtyDaysAgo) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Detect bill category from email content
 */
export function detectCategory(from: string, subject: string, body: string): BillCategory | null {
  const combined = `${from} ${subject} ${body}`.toLowerCase();
  const fullText = `${subject} ${body}`;

  // First, find the base name from sender patterns
  let baseName: string | null = null;
  let baseCategory: BillCategory | null = null;

  for (const { pattern, category, name } of SENDER_PATTERNS) {
    if (pattern.test(combined)) {
      baseName = name || null;
      baseCategory = category;
      break;
    }
  }

  // If we have a base name, check if product refinement overrides the category
  if (baseName) {
    for (const { baseName: base, pattern, category } of PRODUCT_REFINEMENT_PATTERNS) {
      if (baseName === base && pattern.test(fullText) && category) {
        return category;
      }
    }
  }

  return baseCategory;
}

/**
 * Calculate confidence score based on keyword matches
 */
export function calculateConfidence(subject: string, body: string): { confidence: number; matchedKeywords: string[] } {
  const text = `${subject} ${body}`.toLowerCase();
  const matchedKeywords: string[] = [];
  let score = 0;

  // High confidence keywords (0.3 each, max 0.6)
  for (const keyword of BILL_KEYWORDS.high) {
    if (text.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      score += 0.3;
      if (score >= 0.6) break;
    }
  }

  // Medium confidence keywords (0.15 each, max 0.3)
  if (score < 0.9) {
    for (const keyword of BILL_KEYWORDS.medium) {
      if (text.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        score += 0.15;
        if (score >= 0.9) break;
      }
    }
  }

  // Low confidence keywords (0.05 each, max 0.15)
  if (score < 1) {
    for (const keyword of BILL_KEYWORDS.low) {
      if (text.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        score += 0.05;
        if (score >= 1) break;
      }
    }
  }

  return {
    confidence: Math.min(score, 1),
    matchedKeywords,
  };
}

/**
 * Check if a suggestion might be a duplicate of an existing bill
 */
export function checkForDuplicate(
  suggestion: { name: string; amount: number | null; dueDate: string | null },
  existingBills: Bill[]
): { isDuplicate: boolean; billId?: string; reason?: string } {
  const normalizedName = suggestion.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const bill of existingBills) {
    const billName = bill.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check name similarity
    const nameSimilar =
      normalizedName.includes(billName) ||
      billName.includes(normalizedName) ||
      levenshteinDistance(normalizedName, billName) <= 3;

    if (!nameSimilar) continue;

    // If names match, check amount or due date
    if (suggestion.amount !== null && bill.amount !== null) {
      if (Math.abs(suggestion.amount - bill.amount) < 0.01) {
        return {
          isDuplicate: true,
          billId: bill.id,
          reason: `Similar to "${bill.name}" with same amount`,
        };
      }
    }

    if (suggestion.dueDate && bill.due_date) {
      if (suggestion.dueDate === bill.due_date) {
        return {
          isDuplicate: true,
          billId: bill.id,
          reason: `Similar to "${bill.name}" with same due date`,
        };
      }
    }

    // Just name match is also suspicious
    if (nameSimilar) {
      return {
        isDuplicate: true,
        billId: bill.id,
        reason: `Similar name to existing bill "${bill.name}"`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check if an email is promotional/marketing (not a bill)
 */
function isPromotionalEmail(subject: string, snippet: string, body: string): boolean {
  const text = `${subject} ${snippet} ${body}`.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // Check for skip keywords (cancellations, payment confirmations, etc.) - these are NOT bills
  for (const keyword of SKIP_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      return true; // Skip this email
    }
  }

  // Count promotional keywords found
  let promoCount = 0;
  for (const keyword of PROMOTIONAL_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      promoCount++;
      // If we find 2+ promotional keywords, it's definitely promotional
      if (promoCount >= 2) {
        return true;
      }
    }
  }

  // Check for strong promotional indicators in subject alone
  const strongPromoIndicators = [
    'offer', '% off', 'discount', 'coupon', 'deal', 'sale',
    'free', 'promo', 'save', 'earn', 'reward', 'bonus',
    'don\'t miss', 'limited time', 'act now', 'hurry',
    'left in cart', 'still thinking', 'come back', 'we miss you'
  ];

  for (const indicator of strongPromoIndicators) {
    if (subjectLower.includes(indicator)) {
      return true;
    }
  }

  return false;
}

/**
 * Process a single email and return a bill suggestion if it looks like a bill
 */
export function processSingleEmail(
  email: EmailData,
  existingBills: Bill[] = []
): BillSuggestion | null {
  const { id, subject, from, date, snippet, body } = email;
  const fullText = `${subject} ${snippet} ${body}`;

  // Skip promotional/marketing emails
  if (isPromotionalEmail(subject, snippet, body)) {
    return null;
  }

  // Calculate confidence
  const { confidence, matchedKeywords } = calculateConfidence(subject, fullText);

  // Only process emails with reasonable confidence
  if (confidence < 0.15) {
    return null;
  }

  // Extract bill details
  const nameGuess = extractMerchantName(from, subject, body);
  const amountGuess = extractAmount(fullText);
  const dueDateGuess = extractDueDate(fullText);
  const categoryGuess = detectCategory(from, subject, body);

  // Check for duplicates
  const duplicateCheck = checkForDuplicate(
    { name: nameGuess, amount: amountGuess, dueDate: dueDateGuess },
    existingBills
  );

  return {
    gmail_message_id: id,
    email_subject: subject,
    email_from: from,
    email_date: date,
    email_snippet: snippet,
    name_guess: nameGuess,
    amount_guess: amountGuess,
    due_date_guess: dueDateGuess,
    category_guess: categoryGuess,
    confidence,
    matched_keywords: matchedKeywords,
    is_possible_duplicate: duplicateCheck.isDuplicate,
    duplicate_bill_id: duplicateCheck.billId,
    duplicate_reason: duplicateCheck.reason,
  };
}

/**
 * Extract account number (last 4 digits) from email content
 */
function extractAccountNumber(text: string): string | null {
  // Look for patterns like "(...5316)", "ending in 5316", "****5316", "x5316"
  const patterns = [
    /\(\s*[.\s]*(\d{4})\s*\)/,           // (...5316) or (5316)
    /ending\s+in\s+(\d{4})/i,             // ending in 5316
    /\*{2,}(\d{4})/,                      // **5316 or ****5316
    /x+(\d{4})/i,                         // x5316 or xxxx5316
    /account[^0-9]*(\d{4})\b/i,           // account ...5316
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Get base company name for deduplication (e.g., "Chase Ink Business" → "chase")
 */
function getBaseCompanyName(name: string): string {
  const lowerName = name.toLowerCase();

  // Map product-specific names to base company
  if (lowerName.includes('chase')) return 'chase';
  if (lowerName.includes('citi')) return 'citi';
  if (lowerName.includes('capital one')) return 'capital one';
  if (lowerName.includes('amex') || lowerName.includes('american express')) return 'amex';
  if (lowerName.includes('bank of america') || lowerName.includes('bofa')) return 'bofa';
  if (lowerName.includes('wells fargo')) return 'wells fargo';
  if (lowerName.includes('discover')) return 'discover';

  return lowerName;
}

/**
 * Deduplicate suggestions - when same merchant + same amount (or same account), prefer the one with more info
 */
function deduplicateSuggestions(suggestions: BillSuggestion[]): BillSuggestion[] {
  const seen = new Map<string, BillSuggestion>();

  for (const suggestion of suggestions) {
    // Extract account number from email content
    const emailContent = `${suggestion.email_subject} ${suggestion.email_snippet}`;
    const accountNum = extractAccountNumber(emailContent);

    // Get base company name for comparison
    const baseName = getBaseCompanyName(suggestion.name_guess);

    // Create key based on base company + amount OR base company + account number
    const amountKey = suggestion.amount_guess !== null
      ? Math.round(suggestion.amount_guess * 100)
      : 'null';

    // Primary key: base company + amount
    const amountBasedKey = `${baseName}_${amountKey}`;

    // Secondary key: base company + account number (if available)
    const accountBasedKey = accountNum ? `${baseName}_acct_${accountNum}` : null;

    // Check if we've seen this bill before (by either key)
    let existingKey: string | null = null;
    let existing: BillSuggestion | undefined;

    if (accountBasedKey && seen.has(accountBasedKey)) {
      existingKey = accountBasedKey;
      existing = seen.get(accountBasedKey);
    } else if (seen.has(amountBasedKey)) {
      existingKey = amountBasedKey;
      existing = seen.get(amountBasedKey);
    }

    if (!existing) {
      // New suggestion - add it with both keys
      seen.set(amountBasedKey, suggestion);
      if (accountBasedKey) {
        seen.set(accountBasedKey, suggestion);
      }
    } else {
      // Duplicate found - decide which to keep
      const shouldReplace = shouldReplaceExisting(existing, suggestion);

      if (shouldReplace) {
        // Replace with better suggestion
        seen.set(amountBasedKey, suggestion);
        if (accountBasedKey) {
          seen.set(accountBasedKey, suggestion);
        }
        // Also update the old key if different
        if (existingKey && existingKey !== amountBasedKey && existingKey !== accountBasedKey) {
          seen.set(existingKey, suggestion);
        }
      }
    }
  }

  // Remove duplicate values (same suggestion stored under multiple keys)
  const uniqueSuggestions = new Map<string, BillSuggestion>();
  for (const suggestion of seen.values()) {
    uniqueSuggestions.set(suggestion.gmail_message_id, suggestion);
  }

  return Array.from(uniqueSuggestions.values());
}

/**
 * Determine if new suggestion should replace existing one
 */
function shouldReplaceExisting(existing: BillSuggestion, newSuggestion: BillSuggestion): boolean {
  // Prefer more specific names (longer names are usually more specific)
  const existingNameLen = existing.name_guess.length;
  const newNameLen = newSuggestion.name_guess.length;

  // Prefer the one with a due date
  if (!existing.due_date_guess && newSuggestion.due_date_guess) {
    return true;
  }
  if (existing.due_date_guess && !newSuggestion.due_date_guess) {
    return false;
  }

  // Both have due dates or neither - prefer more specific name
  if (newNameLen > existingNameLen + 3) {
    return true;
  }
  if (existingNameLen > newNameLen + 3) {
    return false;
  }

  // Similar name lengths - prefer higher confidence
  return newSuggestion.confidence > existing.confidence;
}

/**
 * Process multiple emails and return bill suggestions
 */
export function processEmails(
  emails: EmailData[],
  existingBills: Bill[] = []
): BillSuggestion[] {
  const suggestions: BillSuggestion[] = [];

  for (const email of emails) {
    const suggestion = processSingleEmail(email, existingBills);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  // Deduplicate suggestions (same name + amount, prefer one with due date)
  const deduplicated = deduplicateSuggestions(suggestions);

  // Sort by confidence (highest first)
  return deduplicated.sort((a, b) => b.confidence - a.confidence);
}
