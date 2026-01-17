/**
 * Constants and patterns for Bill Extraction Engine
 * Migrated and enhanced from lib/bill-detection.ts
 */

import { BillCategory } from '@/types';

// ============================================================================
// PROMOTIONAL KEYWORDS (54 patterns)
// Emails matching these are NOT bills - filter them out
// ============================================================================

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
  "don't miss",
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

// ============================================================================
// SKIP KEYWORDS (18 patterns)
// These indicate payment confirmations, cancellations - NOT upcoming bills
// ============================================================================

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

// ============================================================================
// BILL KEYWORDS with confidence weights
// ============================================================================

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
    'renews soon',
    'will renew',
    'subscription renew',
    'policy payment',
    'payment is due',
    'is due on',
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
    'renews on',
    'will be charged',
    'next payment',
    'premium due',
  ],
  low: [
    'account',
    'billing',
    'payment',
    'subscription',
    'renewal',
    'charged',
    'transaction',
    'policy',
    'premium',
  ],
};

// ============================================================================
// KEYWORD SCORING for amount candidates
// Positive scores indicate bill amounts, negative scores indicate non-bill amounts
// ============================================================================

export const AMOUNT_KEYWORD_SCORES: Array<{ pattern: RegExp; score: number }> = [
  // High positive - definitely the bill amount
  { pattern: /amount\s*due/i, score: 4 },
  { pattern: /payment\s*due/i, score: 4 },
  { pattern: /total\s*due/i, score: 4 },
  { pattern: /balance\s*due/i, score: 4 },
  { pattern: /new\s*balance/i, score: 3.5 },
  { pattern: /statement\s*balance/i, score: 3 },
  { pattern: /current\s*balance/i, score: 2.5 },
  { pattern: /total\s*amount/i, score: 2.5 },
  { pattern: /pay\s*this\s*amount/i, score: 4 },
  { pattern: /total\s*balance/i, score: 3 },

  // Medium positive - likely the bill amount
  { pattern: /total(?![a-z])/i, score: 1.5 },
  { pattern: /(?<![a-z])due(?![a-z])/i, score: 1 },
  { pattern: /owe/i, score: 1.5 },

  // Negative - not the bill amount
  { pattern: /minimum\s*payment/i, score: -5 },
  { pattern: /min\.?\s*(?:payment\s*)?due/i, score: -5 },
  { pattern: /minimum\s*due/i, score: -5 },
  { pattern: /minimum\s*amount/i, score: -5 },
  { pattern: /previous\s*balance/i, score: -3 },
  { pattern: /prior\s*balance/i, score: -3 },
  { pattern: /last\s*statement/i, score: -2 },
  { pattern: /payments?\s*:?\s*-/i, score: -3 },  // "Payments: -$800"
  { pattern: /credits?\s*:?\s*-/i, score: -3 },
  { pattern: /credit/i, score: -2 },
  { pattern: /refund/i, score: -4 },
  { pattern: /cashback/i, score: -2 },
  { pattern: /reward/i, score: -1.5 },
  { pattern: /available/i, score: -1.5 },
  { pattern: /limit/i, score: -1.5 },
  { pattern: /interest\s*charge/i, score: -1 },
  { pattern: /previous\s*balance/i, score: -1 },
  { pattern: /last\s*statement/i, score: -1 },
];

// ============================================================================
// KEYWORD SCORING for date candidates
// ============================================================================

export const DATE_KEYWORD_SCORES: Array<{ pattern: RegExp; score: number }> = [
  // High positive - definitely the due date
  { pattern: /due\s*(?:date|on|by)?/i, score: 3 },
  { pattern: /payment\s*due/i, score: 3 },
  { pattern: /pay\s*by/i, score: 3 },
  { pattern: /due\s*by/i, score: 3 },
  { pattern: /before/i, score: 2 },

  // Medium positive
  { pattern: /auto\s*pay/i, score: 2 },
  { pattern: /scheduled/i, score: 1.5 },
  { pattern: /debit\s*date/i, score: 2 },
  { pattern: /draft\s*date/i, score: 2 },

  // Negative - not the due date
  { pattern: /statement\s*(?:date|closing)/i, score: -2 },
  { pattern: /closing\s*date/i, score: -2 },
  { pattern: /posted/i, score: -1.5 },
  { pattern: /transaction\s*date/i, score: -1.5 },
  { pattern: /as\s*of/i, score: -1 },
  { pattern: /through/i, score: -1 },
];

// ============================================================================
// SENDER PATTERNS - Maps email senders to categories and names
// ============================================================================

export const SENDER_PATTERNS: Array<{
  pattern: RegExp;
  category: BillCategory;
  name?: string;
}> = [
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
  { pattern: /bank\s*of\s*america|bankofamerica/i, category: 'credit_card', name: 'Bank of America' },
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

// ============================================================================
// PRODUCT REFINEMENT PATTERNS
// Distinguish specific products from same company (e.g., Chase Auto vs Chase Ink)
// ============================================================================

export const PRODUCT_REFINEMENT_PATTERNS: Array<{
  baseName: string;
  pattern: RegExp;
  refinedName: string;
  category?: BillCategory;
}> = [
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

// ============================================================================
// AMOUNT EXTRACTION PATTERNS
// ============================================================================

// Patterns for TOTAL/FULL amounts (preferred)
export const TOTAL_AMOUNT_PATTERNS = [
  /(?:total\s*(?:due|balance|amount|owed)?|statement\s*balance|new\s*balance|current\s*balance|amount\s*due|balance\s*due)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
  /\$\s*([\d,]+\.?\d{0,2})\s*(?:total|due|owed|balance)/gi,
  /payment\s*(?:amount)?[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
  /current\s*account\s*balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
];

// Patterns for MINIMUM amounts (to be avoided/deprioritized)
export const MINIMUM_AMOUNT_PATTERNS = [
  /(?:minimum|min\.?)\s*(?:payment|due|amount)?[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
  /\$\s*([\d,]+\.?\d{0,2})\s*(?:minimum|min)/gi,
];

// General amount patterns (fallback)
export const GENERAL_AMOUNT_PATTERNS = [
  /\$\s*([\d,]+\.?\d{0,2})/g,
  /(?:amount|total|due|balance|payment)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/gi,
  /(?:USD|US\$)\s*([\d,]+\.?\d{0,2})/gi,
];

// ============================================================================
// DATE EXTRACTION PATTERNS
// ============================================================================

const MONTH_NAMES = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

export const DATE_PATTERNS = [
  // HIGH PRIORITY: Explicit "due" patterns
  new RegExp(`(?:due|payment)\\s*(?:date|on)?[:\\s]*?(${MONTH_NAMES}\\s+\\d{1,2},?\\s*\\d{4}|\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})`, 'gi'),
  new RegExp(`due\\s+on[:\\s]*?(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)`, 'gi'),
  new RegExp(`\\bdue\\s+(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)`, 'gi'),
  new RegExp(`payment\\s*(?:date|due)?[:\\s]+(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}|${MONTH_NAMES}\\s+\\d{1,2},?\\s*\\d{4}?)`, 'gi'),
  new RegExp(`(?:by|before)\\s+(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)`, 'gi'),
  new RegExp(`scheduled\\s+(?:for|on)\\s+(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}(?:[\\/\\-]\\d{2,4})?)`, 'gi'),
  new RegExp(`(?:debit|draft|withdrawal|auto\\s*pay)\\s*(?:date)?[:\\s]+(\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4}|${MONTH_NAMES}\\s+\\d{1,2},?\\s*\\d{4}?)`, 'gi'),

  // "due in X days"
  /due\s+in\s+(\d+)\s+days?/gi,

  // MEDIUM PRIORITY: Date near dollar amount
  new RegExp(`\\$[\\d,]+\\.?\\d*\\s+(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})`, 'gi'),
  new RegExp(`(${MONTH_NAMES}\\s+\\d{1,2}(?:,?\\s*\\d{4})?|\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})\\s+\\$[\\d,]+\\.?\\d*`, 'gi'),
  new RegExp(`\\bon\\s+(${MONTH_NAMES}\\s+\\d{1,2},\\s*\\d{4})`, 'gi'),

  // LOW PRIORITY: Standalone dates
  new RegExp(`\\b(${MONTH_NAMES}\\s+\\d{1,2},?\\s+\\d{4})\\b`, 'gi'),
  /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
];

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION = {
  amount: {
    min: 0.01,
    max: 50000,
    suspiciousNoDecimalsAbove: 5000,
  },
  date: {
    maxFutureDays: 365,
    maxPastDays: 30,
  },
  confidence: {
    autoAcceptThreshold: 0.85,
    needsReviewThreshold: 0.60,
    minKeywordScore: 0.15,
  },
};

// ============================================================================
// CONFIDENCE WEIGHTS
// ============================================================================

export const CONFIDENCE_WEIGHTS = {
  amount: 0.30,
  dueDate: 0.30,
  name: 0.25,
  category: 0.15,
};

// ============================================================================
// AI MODEL CONFIGURATION
// ============================================================================

export const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 2048,
  maxBodyLength: 3000, // Truncate email body to this length
};

// ============================================================================
// PAYMENT LINK EXTRACTION CONSTANTS
// ============================================================================

/**
 * Keywords in anchor text that indicate payment links (with scores)
 * Higher scores = more likely to be a payment link
 */
export const PAYMENT_LINK_KEYWORDS: Array<{ pattern: RegExp; score: number }> = [
  // High confidence - explicit payment actions
  { pattern: /pay\s*now/i, score: 5 },
  { pattern: /make\s*(?:a\s*)?payment/i, score: 5 },
  { pattern: /pay\s*(?:your\s*)?bill/i, score: 5 },
  { pattern: /pay\s*online/i, score: 5 },
  { pattern: /pay\s*balance/i, score: 4 },
  { pattern: /submit\s*payment/i, score: 4 },
  { pattern: /one[- ]?time\s*payment/i, score: 4 },

  // Medium-high confidence - account management related to payment
  { pattern: /view\s*(?:your\s*)?bill/i, score: 3 },
  { pattern: /view\s*(?:and\s*)?pay/i, score: 4 },
  { pattern: /manage\s*payment/i, score: 3 },
  { pattern: /payment\s*options/i, score: 3 },
  { pattern: /autopay/i, score: 3 },
  { pattern: /auto[- ]?pay/i, score: 3 },
  { pattern: /set\s*up\s*payment/i, score: 3 },

  // Medium confidence - account access that could lead to payment
  { pattern: /view\s*(?:your\s*)?account/i, score: 2 },
  { pattern: /(?:sign|log)\s*in\s*to\s*pay/i, score: 4 },
  { pattern: /account\s*details/i, score: 1 },
  { pattern: /my\s*account/i, score: 1 },

  // Low confidence - generic but possibly payment related
  { pattern: /view\s*statement/i, score: 1 },
  { pattern: /billing/i, score: 1 },
];

/**
 * Patterns that indicate a link is NOT a payment link (junk/noise)
 */
export const PAYMENT_LINK_JUNK_PATTERNS: RegExp[] = [
  // Unsubscribe/marketing
  /unsubscribe/i,
  /opt[- ]?out/i,
  /email\s*preferences/i,
  /manage\s*(?:email\s*)?subscriptions?/i,
  /notification\s*settings/i,

  // Privacy/legal
  /privacy\s*(?:policy|notice)?/i,
  /terms\s*(?:of\s*service|and\s*conditions|of\s*use)?/i,
  /legal/i,
  /disclaimer/i,

  // Social media
  /facebook/i,
  /twitter/i,
  /instagram/i,
  /linkedin/i,
  /youtube/i,
  /tiktok/i,
  /pinterest/i,

  // Contact/support (not payment)
  /contact\s*us/i,
  /customer\s*(?:support|service)/i,
  /help\s*center/i,
  /faq/i,
  /live\s*chat/i,

  // App downloads
  /app\s*store/i,
  /google\s*play/i,
  /download\s*(?:the\s*)?app/i,

  // Other non-payment links
  /refer\s*a\s*friend/i,
  /rewards/i,
  /shop\s*now/i,
  /learn\s*more/i,
  /read\s*more/i,
  /click\s*here\s*to\s*view/i,
  /view\s*(?:in\s*)?browser/i,
  /web\s*version/i,
];

/**
 * URL shortener domains that should be blocked
 * These could redirect anywhere and pose security risks
 */
export const URL_SHORTENERS: string[] = [
  'bit.ly',
  'bitly.com',
  't.co',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'adf.ly',
  'j.mp',
  'tr.im',
  'cli.gs',
  'short.to',
  'budurl.com',
  'ping.fm',
  'post.ly',
  'just.as',
  'bkite.com',
  'snipr.com',
  'flic.kr',
  'twitthis.com',
  'u.telefonocasa.pro',
  'tiny.cc',
  'lnkd.in',
  'db.tt',
  'qr.ae',
  'cur.lv',
  'ity.im',
  'q.gs',
  'po.st',
  'bc.vc',
  'su.pr',
  'twurl.nl',
  'tl.gd',
];

/**
 * Validation settings for payment links
 */
export const PAYMENT_LINK_VALIDATION = {
  autoFillThreshold: 0.80,          // Min confidence to auto-fill payment_url on bills
  minCandidateScore: 2,             // Min score for a candidate to be considered
  maxCandidates: 10,                // Max candidates to pass to AI
  requireHttps: true,               // Only allow HTTPS URLs
  allowSubdomains: true,            // Allow subdomains of allowed domains
};

/**
 * AI configuration for payment link selection
 */
export const PAYMENT_LINK_AI_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 512,
  temperature: 0,                   // Deterministic selection
};
