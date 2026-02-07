/**
 * Payment Link Candidate Extraction
 *
 * Parses HTML emails with cheerio to extract <a href> candidates,
 * scores them by anchor text keywords, and filters out junk links.
 */

import { load } from 'cheerio';
import {
  PaymentLinkCandidate,
  PaymentLinkExtractionResult,
} from './types';

type CheerioAPI = ReturnType<typeof load>;
import {
  PAYMENT_LINK_KEYWORDS,
  PAYMENT_LINK_JUNK_PATTERNS,
  URL_SHORTENERS,
  PAYMENT_LINK_VALIDATION,
} from './constants';

/**
 * Extract domain from a URL
 */
function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Check if a URL is from a shortener service
 */
function isShortenerUrl(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;
  return URL_SHORTENERS.some(shortener =>
    domain === shortener || domain.endsWith('.' + shortener)
  );
}

/**
 * Check if a link matches junk patterns (unsubscribe, social, etc.)
 */
function isJunkLink(anchorText: string, url: string): boolean {
  const textToCheck = anchorText.toLowerCase();
  const urlToCheck = url.toLowerCase();

  return PAYMENT_LINK_JUNK_PATTERNS.some(pattern =>
    pattern.test(textToCheck) || pattern.test(urlToCheck)
  );
}

/**
 * Calculate score for a payment link candidate based on anchor text
 */
function calculateLinkScore(anchorText: string): number {
  let score = 0;

  for (const { pattern, score: keywordScore } of PAYMENT_LINK_KEYWORDS) {
    if (pattern.test(anchorText)) {
      score += keywordScore;
    }
  }

  return score;
}

/**
 * Extract context around a link element (parent text)
 * Using 'any' for element due to cheerio's complex internal types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractContext($: CheerioAPI, element: any): string {
  const $el = $(element);

  // Try to get parent's text content for context
  const parent = $el.parent();
  let context = parent.text().trim();

  // If parent is too short, try grandparent
  if (context.length < 20) {
    const grandparent = parent.parent();
    context = grandparent.text().trim();
  }

  // Truncate to ~80 chars
  if (context.length > 80) {
    const linkText = $el.text().trim();
    const linkIndex = context.indexOf(linkText);

    if (linkIndex >= 0) {
      // Center around the link
      const start = Math.max(0, linkIndex - 30);
      const end = Math.min(context.length, linkIndex + linkText.length + 30);
      context = context.substring(start, end);
    } else {
      context = context.substring(0, 80);
    }
  }

  return context.replace(/\s+/g, ' ').trim();
}

/**
 * Main function: Extract payment link candidates from HTML email body
 */
export function extractPaymentLinkCandidates(
  bodyHtml: string | null
): PaymentLinkExtractionResult {
  // Handle null/empty input
  if (!bodyHtml || bodyHtml.trim().length === 0) {
    return {
      candidates: [],
      skipReason: 'No HTML body provided',
    };
  }

  try {
    const $ = load(bodyHtml);
    const candidates: PaymentLinkCandidate[] = [];
    const seenUrls = new Set<string>();
    let position = 0;

    // Find all anchor tags
    $('a[href]').each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');

      if (!href) return;

      // Normalize the URL
      let url = href.trim();

      // Skip non-http links
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Try to handle relative URLs or mailto: links
        if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
          return;
        }
        // Could be a relative URL - skip for now
        return;
      }

      // Skip if we've already seen this URL
      const normalizedUrl = url.toLowerCase();
      if (seenUrls.has(normalizedUrl)) {
        return;
      }
      seenUrls.add(normalizedUrl);

      // Get anchor text
      const anchorText = $el.text().trim() || $el.attr('title') || '';

      // Skip junk links
      if (isJunkLink(anchorText, url)) {
        return;
      }

      // Skip URL shorteners
      if (isShortenerUrl(url)) {
        return;
      }

      // Require HTTPS if configured
      if (PAYMENT_LINK_VALIDATION.requireHttps && !url.startsWith('https://')) {
        return;
      }

      // Calculate score
      const score = calculateLinkScore(anchorText);

      // Only include candidates with minimum score
      if (score < PAYMENT_LINK_VALIDATION.minCandidateScore) {
        return;
      }

      // Extract domain
      const domain = extractDomain(url);
      if (!domain) return;

      // Extract context
      const context = extractContext($, element);

      candidates.push({
        url,
        anchorText,
        score,
        domain,
        context,
        position: position++,
      });
    });

    // Sort by score (descending), then by position (ascending for tie-breaker)
    candidates.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.position - b.position;
    });

    // Limit to max candidates
    const limitedCandidates = candidates.slice(0, PAYMENT_LINK_VALIDATION.maxCandidates);

    if (limitedCandidates.length === 0) {
      return {
        candidates: [],
        skipReason: 'No payment link candidates found',
      };
    }

    return {
      candidates: limitedCandidates,
      skipReason: null,
    };
  } catch (error) {
    console.error('Error parsing HTML for payment links:', error);
    return {
      candidates: [],
      skipReason: `HTML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Utility function to extract domain from email "from" address
 */
export function extractDomainFromEmail(fromAddress: string): string {
  // Handle formats like "Name <email@domain.com>" or just "email@domain.com"
  const match = fromAddress.match(/@([a-zA-Z0-9.-]+)/);
  return match ? match[1].toLowerCase() : '';
}
