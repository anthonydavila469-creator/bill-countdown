/**
 * Known Biller Domains for Pre-filtering
 * Extracted from SENDER_PATTERNS to enable cost-optimized Gmail sync
 */

/**
 * Set of known biller email domains
 * These emails pass through pre-filtering without keyword checks
 */
export const KNOWN_BILLER_DOMAINS: Set<string> = new Set([
  // Utilities
  'pge.com',
  'sce.com',
  'duke-energy.com',
  'coned.com',
  'conedison.com',
  'socalgas.com',
  'nationalgridus.com',
  'nationalgrid.com',

  // Streaming & Subscriptions
  'netflix.com',
  'spotify.com',
  'hulu.com',
  'disneyplus.com',
  'hbomax.com',
  'max.com',
  'amazon.com',
  'primevideo.com',
  'apple.com',
  'youtube.com',
  'paramountplus.com',
  'peacocktv.com',
  'audible.com',
  'adobe.com',
  'microsoft.com',
  'dropbox.com',
  'icloud.com',
  'google.com',
  'openai.com',
  'anthropic.com',

  // Gyms/Fitness
  'planetfitness.com',
  'lafitness.com',
  'equinox.com',
  '24hourfitness.com',

  // Insurance
  'geico.com',
  'progressive.com',
  'statefarm.com',
  'allstate.com',
  'libertymutual.com',
  'farmers.com',
  'usaa.com',

  // Phone/Mobile
  'verizon.com',
  'verizonwireless.com',
  'att.com',
  't-mobile.com',
  'sprint.com',
  'mintmobile.com',
  'visible.com',
  'cricketwireless.com',

  // Internet/Cable
  'comcast.com',
  'xfinity.com',
  'spectrum.com',
  'charter.com',
  'cox.com',
  'frontier.com',
  'centurylink.com',
  'optimum.com',
  'alticeusa.com',
  'googlefiber.com',
  'starlink.com',

  // Credit Cards & Banks
  'chase.com',
  'americanexpress.com',
  'capitalone.com',
  'discover.com',
  'citi.com',
  'citibank.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'synchrony.com',
  'synchronybank.com',
  'barclays.com',
  'barclaycard.com',
  'bestbuy.com',

  // Loans
  'navient.com',
  'nelnet.com',
  'mohela.com',
  'aidvantage.com',
  'myfedloan.org',
  'sofi.com',

  // Other common billers
  'paypal.com',
  'venmo.com',
  'zelle.com',
]);

/**
 * Check if an email address is from a known biller domain
 */
export function isKnownBillerDomain(email: string): boolean {
  const domainMatch = email.toLowerCase().match(/@([a-z0-9.-]+)$/);
  if (!domainMatch) return false;

  const domain = domainMatch[1];

  // Direct match
  if (KNOWN_BILLER_DOMAINS.has(domain)) return true;

  // Check if it's a subdomain of a known biller
  // e.g., "notifications.chase.com" should match "chase.com"
  for (const knownDomain of KNOWN_BILLER_DOMAINS) {
    if (domain.endsWith('.' + knownDomain)) {
      return true;
    }
  }

  return false;
}

/**
 * Bill-related keywords for Gmail search query
 */
const BILL_SEARCH_KEYWORDS = [
  'bill',
  'invoice',
  'payment',
  'statement',
  'amount due',
  'payment due',
  'balance due',
];

/**
 * Generate optimized Gmail search query for bill emails
 * Uses 2 days instead of 1 to handle cron failures/delays
 * Duplicates are filtered by existing deduplication logic
 */
export function getOptimizedGmailQuery(daysBack: number = 2): string {
  const keywordQuery = BILL_SEARCH_KEYWORDS.map(
    (kw) => `subject:(${kw})`
  ).join(' OR ');

  return `(${keywordQuery}) newer_than:${daysBack}d`;
}

/**
 * Subject keywords that indicate a bill (for pre-filtering)
 */
export const BILL_SUBJECT_KEYWORDS = [
  'bill',
  'invoice',
  'payment',
  'statement',
  'amount due',
  'balance due',
  'payment due',
  'your bill',
  'pay now',
  'autopay',
  'auto-pay',
  'due date',
  'minimum payment',
];

/**
 * Promotional keywords to filter out (emails with these are likely not bills)
 */
export const PROMOTIONAL_FILTER_KEYWORDS = [
  'special offer',
  'limited time',
  'discount',
  'coupon',
  'promo code',
  '% off',
  'sale',
  'flash sale',
  'free shipping',
  'earn rewards',
  'cashback',
  'unsubscribe',
  'newsletter',
  'shop now',
  'buy now',
];

/**
 * Check if email subject contains bill-related keywords
 */
export function hasBillKeywords(subject: string): boolean {
  const lowerSubject = subject.toLowerCase();
  return BILL_SUBJECT_KEYWORDS.some((kw) => lowerSubject.includes(kw));
}

/**
 * Check if email appears to be promotional (not a bill)
 */
export function isPromotionalEmail(subject: string): boolean {
  const lowerSubject = subject.toLowerCase();
  return PROMOTIONAL_FILTER_KEYWORDS.some((kw) => lowerSubject.includes(kw));
}
