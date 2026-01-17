/**
 * Email preprocessing utilities
 * Converts HTML to readable text while preserving table structure
 * Removes signatures, footers, and legal disclaimers
 */

// ============================================================================
// HTML to Text Conversion
// ============================================================================

/**
 * Convert HTML email to readable text while preserving table structure
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  let text = html;

  // Remove script and style tags with content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Handle common block elements - add line breaks
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n');
  text = text.replace(/<(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n');

  // Handle table cells - add tab separator for columns
  text = text.replace(/<\/t[dh][^>]*>/gi, '\t');
  text = text.replace(/<t[dh][^>]*>/gi, '');

  // Handle links - extract text
  text = text.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text
    .replace(/\t+/g, '  ')      // Replace tabs with spaces
    .replace(/ +/g, ' ')         // Collapse multiple spaces
    .replace(/\n\s*\n/g, '\n\n') // Collapse multiple newlines
    .trim();

  return text;
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&copy;': '(c)',
    '&reg;': '(R)',
    '&trade;': '(TM)',
    '&mdash;': '-',
    '&ndash;': '-',
    '&hellip;': '...',
    '&bull;': '*',
    '&rsquo;': "'",
    '&lsquo;': "'",
    '&rdquo;': '"',
    '&ldquo;': '"',
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) => {
    const code = parseInt(num, 10);
    return code > 0 && code < 65536 ? String.fromCharCode(code) : '';
  });

  return result;
}

// ============================================================================
// Footer and Signature Removal
// ============================================================================

/**
 * Patterns that indicate the start of a footer/signature section
 */
const FOOTER_PATTERNS = [
  // Legal disclaimers
  /^this (email|message|communication) (is|was) (intended|sent|confidential)/i,
  /^if you (have )?received this (email|message) in error/i,
  /^please do not reply to this (email|message)/i,
  /^this is an automated (message|email|notification)/i,
  /^unsubscribe|manage (your )?preferences|email preferences/i,
  /^to stop receiving these emails/i,
  /^you are receiving this (email|message) because/i,
  /^copyright \d{4}|©\s*\d{4}/i,
  /^all rights reserved/i,
  /^privacy policy|terms (of|and) (use|service)/i,

  // Common signature starters
  /^(regards|sincerely|thanks|best|cheers),?$/i,
  /^(thank you|many thanks),?$/i,
  /^--\s*$/,
  /^_{3,}$/,
  /^-{3,}$/,

  // Address/contact blocks
  /^\d{1,5}\s+[a-z]+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln)/i,
  /^(phone|tel|fax|mobile|cell):\s*[\d\-\(\)\+]/i,

  // Social media links
  /^(follow us|connect with us|find us on)/i,
  /^(facebook|twitter|instagram|linkedin|youtube)/i,
];

/**
 * Keywords that indicate we're in a footer section
 */
const FOOTER_KEYWORDS = [
  'unsubscribe',
  'opt-out',
  'opt out',
  'email preferences',
  'manage subscriptions',
  'privacy policy',
  'terms of service',
  'terms of use',
  'confidential',
  'intended recipient',
  'unauthorized use',
  'privileged',
  'copyright ©',
  'all rights reserved',
];

/**
 * Remove signatures, footers, and legal disclaimers from email text
 */
export function removeFooters(text: string): string {
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  let inFooter = false;
  let footerStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this line starts a footer section
    if (!inFooter) {
      // Check against footer patterns
      const isFooterStart = FOOTER_PATTERNS.some(pattern => pattern.test(line));

      // Check for high density of footer keywords in remaining text
      if (!isFooterStart && line.length > 10) {
        const remainingText = lines.slice(i).join(' ').toLowerCase();
        const footerKeywordCount = FOOTER_KEYWORDS.filter(kw =>
          remainingText.includes(kw.toLowerCase())
        ).length;

        // If we see 3+ footer keywords in remaining text and we're past 60% of email
        if (footerKeywordCount >= 3 && i > lines.length * 0.6) {
          inFooter = true;
          footerStartLine = i;
        }
      }

      if (isFooterStart) {
        inFooter = true;
        footerStartLine = i;
      }
    }

    if (!inFooter) {
      cleanedLines.push(lines[i]);
    }
  }

  // If we removed too much (> 40% of content), restore some of it
  if (footerStartLine > 0 && footerStartLine < lines.length * 0.4) {
    // We probably cut too early, restore up to a safer point
    const restoredLines = lines.slice(0, Math.floor(lines.length * 0.75));
    return restoredLines.join('\n').trim();
  }

  return cleanedLines.join('\n').trim();
}

// ============================================================================
// Main Preprocessing Function
// ============================================================================

export interface PreprocessResult {
  cleanedText: string;
  originalLength: number;
  cleanedLength: number;
}

/**
 * Preprocess an email for bill extraction
 * 1. Convert HTML to text (if HTML provided)
 * 2. Remove footers, signatures, and legal disclaimers
 * 3. Normalize whitespace
 */
export function preprocessEmail(
  bodyPlain: string | null,
  bodyHtml: string | null
): PreprocessResult {
  // Prefer plain text, fall back to HTML conversion
  let text = bodyPlain || '';

  if (!text && bodyHtml) {
    text = htmlToText(bodyHtml);
  } else if (bodyHtml && text.length < 200) {
    // If plain text is very short, try HTML conversion
    const htmlText = htmlToText(bodyHtml);
    if (htmlText.length > text.length * 1.5) {
      text = htmlText;
    }
  }

  const originalLength = text.length;

  // Remove footers and signatures
  let cleaned = removeFooters(text);

  // Normalize whitespace
  cleaned = cleaned
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();

  return {
    cleanedText: cleaned,
    originalLength,
    cleanedLength: cleaned.length,
  };
}

/**
 * Extract a context window around a match position
 * Used for providing evidence snippets
 */
export function extractContext(
  text: string,
  position: number,
  windowSize: number = 80
): string {
  const halfWindow = Math.floor(windowSize / 2);
  const start = Math.max(0, position - halfWindow);
  const end = Math.min(text.length, position + halfWindow);

  let context = text.substring(start, end);

  // Add ellipsis if truncated
  if (start > 0) {
    context = '...' + context;
  }
  if (end < text.length) {
    context = context + '...';
  }

  // Clean up whitespace in context
  context = context.replace(/\s+/g, ' ').trim();

  return context;
}
