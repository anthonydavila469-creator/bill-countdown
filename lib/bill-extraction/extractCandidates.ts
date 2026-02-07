/**
 * Deterministic candidate extraction with keyword scoring
 * Extracts money, date, and name candidates from email text
 */

import { BillCategory } from '@/types';
import {
  AmountCandidate,
  DateCandidate,
  NameCandidate,
  CandidateExtractionResult,
} from './types';
import {
  PROMOTIONAL_KEYWORDS,
  SKIP_KEYWORDS,
  BILL_KEYWORDS,
  AMOUNT_KEYWORD_SCORES,
  DATE_KEYWORD_SCORES,
  TOTAL_AMOUNT_PATTERNS,
  MINIMUM_AMOUNT_PATTERNS,
  GENERAL_AMOUNT_PATTERNS,
  DATE_PATTERNS,
  SENDER_PATTERNS,
  PRODUCT_REFINEMENT_PATTERNS,
  VALIDATION,
} from './constants';
import { extractContext } from './preprocessEmail';

// ============================================================================
// Amount Extraction
// ============================================================================

/**
 * Check if an amount is reasonable for a bill
 */
function isReasonableBillAmount(amount: number, hasDecimals: boolean): boolean {
  if (amount < VALIDATION.amount.min) return false;
  if (amount > VALIDATION.amount.max) return false;

  // Large round numbers without decimals are suspicious
  if (amount > VALIDATION.amount.suspiciousNoDecimalsAbove && !hasDecimals) {
    return false;
  }

  // Looks like a zip code (10001, 20001, etc.)
  if (
    amount > 1000 &&
    amount === Math.floor(amount) &&
    amount % 100 === 1
  ) {
    return false;
  }

  return true;
}

/**
 * Calculate keyword score for an amount based on surrounding context
 */
function scoreAmountContext(context: string): number {
  let score = 0;
  const lowerContext = context.toLowerCase();

  for (const { pattern, score: patternScore } of AMOUNT_KEYWORD_SCORES) {
    if (pattern.test(lowerContext)) {
      score += patternScore;
    }
  }

  return score;
}

/**
 * Extract amount candidates from text
 */
export function extractAmountCandidates(text: string): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  // Track best candidate index for each amount (for updating if we find better context)
  const amountToIndex = new Map<number, number>();

  // Helper to add candidate
  const addCandidate = (
    amount: number,
    position: number,
    patternType: 'total' | 'minimum' | 'general',
    hasDecimals: boolean
  ) => {
    // Round to 2 decimal places
    const roundedAmount = Math.round(amount * 100) / 100;

    if (!isReasonableBillAmount(roundedAmount, hasDecimals)) return;

    const context = extractContext(text, position);

    // Extract prefix for minimum detection (50 chars is enough to catch keywords)
    const prefixStart = Math.max(0, position - 50);
    const prefixContext = text.substring(prefixStart, position);
    const prefixLower = prefixContext.toLowerCase();

    // Check if this is labeled as a minimum in the prefix only
    const isMinimumFromPrefix = /minimum|min\.?\s*(?:payment|due|amount)/i.test(prefixLower);

    // Check if this is labeled as the total/new balance (overrides minimum detection)
    const isTotalFromPrefix = /(?:new|total|statement|current)\s*balance|amount\s*due|total\s*due|balance\s*due/i.test(prefixLower);

    // Score using a SMALLER context to avoid picking up unrelated keywords
    // 50 chars before + 20 chars after is enough to capture immediate context
    const scoringPrefixStart = Math.max(0, position - 50);
    const scoringSuffixEnd = Math.min(text.length, position + 20);
    const scoringContext = text.substring(scoringPrefixStart, scoringSuffixEnd);
    const keywordScore = scoreAmountContext(scoringContext);

    const newCandidate: AmountCandidate = {
      value: roundedAmount,
      context,
      keywordScore,
      isMinimum: (patternType === 'minimum' || isMinimumFromPrefix) && !isTotalFromPrefix,
      hasDecimals,
      patternType,
    };

    // Check if we already have this amount
    const existingIndex = amountToIndex.get(roundedAmount);
    if (existingIndex !== undefined) {
      // Update if new candidate has higher keyword score
      if (keywordScore > candidates[existingIndex].keywordScore) {
        candidates[existingIndex] = newCandidate;
      }
    } else {
      // New amount - add to candidates
      amountToIndex.set(roundedAmount, candidates.length);
      candidates.push(newCandidate);
    }
  };

  // Extract from total amount patterns (highest priority)
  // For TOTAL patterns, use the position of the $ sign or amount, not the keyword
  for (const pattern of TOTAL_AMOUNT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      const hasDecimals = amountStr.includes('.');
      if (!isNaN(amount)) {
        // Find position of the actual amount within the match
        // This ensures the prefix context includes the keyword (e.g., "New Balance:")
        const dollarPos = match[0].indexOf('$');
        const amountPos = dollarPos >= 0
          ? match.index + dollarPos
          : match.index + match[0].length - match[1].length;
        addCandidate(amount, amountPos, 'total', hasDecimals);
      }
    }
  }

  // Extract from minimum amount patterns
  for (const pattern of MINIMUM_AMOUNT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      const hasDecimals = amountStr.includes('.');
      if (!isNaN(amount)) {
        addCandidate(amount, match.index, 'minimum', hasDecimals);
      }
    }
  }

  // Extract from general patterns (lowest priority)
  for (const pattern of GENERAL_AMOUNT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      const hasDecimals = amountStr.includes('.');
      if (!isNaN(amount)) {
        addCandidate(amount, match.index, 'general', hasDecimals);
      }
    }
  }

  // Sort by keyword score (descending), then by pattern type priority
  return candidates.sort((a, b) => {
    // First by keyword score
    if (b.keywordScore !== a.keywordScore) {
      return b.keywordScore - a.keywordScore;
    }
    // Then by pattern type (total > general > minimum)
    const typePriority = { total: 0, general: 1, minimum: 2 };
    return typePriority[a.patternType] - typePriority[b.patternType];
  });
}

// ============================================================================
// Date Extraction
// ============================================================================

/**
 * Month name to number mapping
 */
const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parse a date string into YYYY-MM-DD format
 */
function parseDate(dateStr: string): string | null {
  const currentYear = new Date().getFullYear();
  const now = new Date();
  const cleaned = dateStr.trim().replace(/,/g, '');

  let date: Date | null = null;

  // Try "Feb 13" or "February 13" or "Feb 13 2026" patterns
  const monthNameMatch = cleaned.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/i);
  if (monthNameMatch) {
    const monthName = monthNameMatch[1].toLowerCase();
    const day = parseInt(monthNameMatch[2]);
    const year = monthNameMatch[3] ? parseInt(monthNameMatch[3]) : currentYear;

    if (MONTH_MAP[monthName] !== undefined && day >= 1 && day <= 31) {
      date = new Date(year, MONTH_MAP[monthName], day);
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
  const thirtyDaysAgo = new Date(now.getTime() - VALIDATION.date.maxPastDays * 24 * 60 * 60 * 1000);
  if (date < thirtyDaysAgo) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date.toISOString().split('T')[0];
}

/**
 * Calculate keyword score for a date based on surrounding context
 */
function scoreDateContext(context: string): number {
  let score = 0;
  const lowerContext = context.toLowerCase();

  for (const { pattern, score: patternScore } of DATE_KEYWORD_SCORES) {
    if (pattern.test(lowerContext)) {
      score += patternScore;
    }
  }

  return score;
}

/**
 * Check if a date at a given position is part of a billing period date range
 * e.g., "Billing Period: 11/20/2025 - 12/19/2025" or "11/20 - 12/19"
 * Only returns true if THIS specific date is one of the dates in a range pattern
 */
function isPartOfDateRange(text: string, matchIndex: number, dateStr: string): boolean {
  // Check a small window around the date to see if it's part of a "date - date" pattern
  // We only want to skip dates that are DIRECTLY part of a range, not all dates in an email
  const windowStart = Math.max(0, matchIndex - 20);
  const windowEnd = Math.min(text.length, matchIndex + dateStr.length + 20);
  const immediateContext = text.substring(windowStart, windowEnd);

  // Check if this date is immediately followed by " - date" or preceded by "date - "
  // This ensures we only skip dates that are PART of the range, not nearby dates
  const isStartOfRange = new RegExp(dateStr.replace(/[\/\-]/g, '[/\\-]') + '\\s*-\\s*\\d{1,2}[/\\-]\\d{1,2}').test(immediateContext);
  const isEndOfRange = new RegExp('\\d{1,2}[/\\-]\\d{1,2}[/\\-]?\\d{0,4}\\s*-\\s*' + dateStr.replace(/[\/\-]/g, '[/\\-]')).test(immediateContext);

  return isStartOfRange || isEndOfRange;
}

/**
 * Extract date candidates from text
 */
export function extractDateCandidates(text: string): DateCandidate[] {
  const candidates: DateCandidate[] = [];
  const seenDates = new Set<string>();

  for (let i = 0; i < DATE_PATTERNS.length; i++) {
    const pattern = DATE_PATTERNS[i];
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const dateStr = match[1];

      // Handle "due in X days"
      if (/^\d+$/.test(dateStr)) {
        const days = parseInt(dateStr);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        const isoDate = dueDate.toISOString().split('T')[0];

        if (!seenDates.has(isoDate)) {
          seenDates.add(isoDate);
          const context = extractContext(text, match.index);
          candidates.push({
            value: isoDate,
            context,
            keywordScore: scoreDateContext(context),
            patternPriority: i,
            isRelative: true,
          });
        }
        continue;
      }

      // Skip dates that are part of a billing period date range
      if (isPartOfDateRange(text, match.index, dateStr)) {
        continue;
      }

      const parsed = parseDate(dateStr);
      if (parsed && !seenDates.has(parsed)) {
        seenDates.add(parsed);
        const context = extractContext(text, match.index);
        candidates.push({
          value: parsed,
          context,
          keywordScore: scoreDateContext(context),
          patternPriority: i,
          isRelative: false,
        });
      }
    }
  }

  // Sort by keyword score first, then by pattern priority
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  return candidates.sort((a, b) => {
    // First by keyword score
    if (b.keywordScore !== a.keywordScore) {
      return b.keywordScore - a.keywordScore;
    }

    // Then prefer future dates
    const aIsFuture = a.value >= today;
    const bIsFuture = b.value >= today;
    if (aIsFuture && !bIsFuture) return -1;
    if (!aIsFuture && bIsFuture) return 1;

    // Then by pattern priority (lower = higher priority)
    return a.patternPriority - b.patternPriority;
  });
}

// ============================================================================
// Name Extraction
// ============================================================================

/**
 * Extract name candidates from email metadata and content
 */
export function extractNameCandidates(
  from: string,
  subject: string,
  body: string
): NameCandidate[] {
  const candidates: NameCandidate[] = [];
  const fullText = `${subject} ${body}`;
  let baseName: string | null = null;
  let baseCategory: BillCategory | null = null;

  // Check sender patterns
  for (const { pattern, category, name } of SENDER_PATTERNS) {
    if (pattern.test(from) || pattern.test(subject)) {
      if (name) {
        baseName = name;
        baseCategory = category;
        candidates.push({
          value: name,
          source: 'sender',
          confidence: 0.8,
          category,
        });
      } else {
        baseCategory = category;
      }
      break;
    }
  }

  // Check product refinement patterns
  if (baseName) {
    for (const { baseName: base, pattern, refinedName, category } of PRODUCT_REFINEMENT_PATTERNS) {
      if (baseName === base && pattern.test(fullText)) {
        candidates.unshift({
          value: refinedName,
          source: 'product_refinement',
          confidence: 0.9,
          category: category || baseCategory || undefined,
        });
        break;
      }
    }
  }

  // Extract from email address
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s@]+@[^\s@]+)/);
  if (emailMatch) {
    const email = emailMatch[1];
    const domain = email.split('@')[1]?.split('.')[0];
    if (domain && domain.length > 2 && !/noreply|billing|notification/i.test(domain)) {
      const domainName = domain.charAt(0).toUpperCase() + domain.slice(1);
      if (!candidates.some(c => c.value.toLowerCase() === domainName.toLowerCase())) {
        candidates.push({
          value: domainName,
          source: 'sender',
          confidence: 0.5,
        });
      }
    }
  }

  // Extract from "Name <email>" format
  const nameMatch = from.match(/^([^<]+)</);
  if (nameMatch) {
    const name = nameMatch[1].trim()
      .replace(/billing|noreply|no-reply|notifications?|support/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (name.length > 1 && !candidates.some(c => c.value.toLowerCase() === name.toLowerCase())) {
      candidates.push({
        value: name,
        source: 'sender',
        confidence: 0.6,
      });
    }
  }

  return candidates;
}

// ============================================================================
// Bill Keyword Scoring
// ============================================================================

/**
 * Calculate overall bill likelihood score based on keyword matches
 */
export function calculateKeywordScore(
  subject: string,
  body: string
): { score: number; matchedKeywords: string[] } {
  const text = `${subject} ${body}`.toLowerCase();
  const matchedKeywords: string[] = [];
  let score = 0;

  // High confidence keywords (0.3 each, max 0.6)
  let highScore = 0;
  for (const keyword of BILL_KEYWORDS.high) {
    if (text.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      highScore += 0.3;
      if (highScore >= 0.6) break;
    }
  }
  score += Math.min(highScore, 0.6);

  // Medium confidence keywords (0.15 each, max 0.3)
  if (score < 0.9) {
    let mediumScore = 0;
    for (const keyword of BILL_KEYWORDS.medium) {
      if (text.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        mediumScore += 0.15;
        if (mediumScore >= 0.3) break;
      }
    }
    score += Math.min(mediumScore, 0.3);
  }

  // Low confidence keywords (0.05 each, max 0.15)
  if (score < 1) {
    let lowScore = 0;
    for (const keyword of BILL_KEYWORDS.low) {
      if (text.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
        lowScore += 0.05;
        if (lowScore >= 0.15) break;
      }
    }
    score += Math.min(lowScore, 0.15);
  }

  return {
    score: Math.min(score, 1),
    matchedKeywords,
  };
}

// ============================================================================
// Bill Signal Detection
// ============================================================================

const BILL_SIGNALS = [
  'amount due',
  'minimum payment',
  'payment due',
  'due date',
  'statement',
  'invoice',
  'billing',
  'past due',
  'balance due',
  'total due',
  'autopay',
  'auto pay',
  'automatic payment',
  'scheduled payment',
  'new balance',
  'current balance',
];

/**
 * Check if text contains strong bill signals
 */
function hasBillSignals(subject: string, body: string): boolean {
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();

  return BILL_SIGNALS.some(signal =>
    subjectLower.includes(signal) || bodyLower.includes(signal)
  );
}

// ============================================================================
// Promotional/Skip Detection
// ============================================================================

/**
 * Check if an email is promotional or should be skipped
 * Now with HIGH RECALL - only skip if clearly not a bill
 */
export function checkIfShouldSkip(
  subject: string,
  body: string
): { shouldSkip: boolean; reason: string | null; debugInfo?: object } {
  const subjectLower = subject.toLowerCase().replace(/\s+/g, ' ').trim();
  const bodyLower = body.toLowerCase().replace(/\s+/g, ' ').trim();

  // Check for bill signals - if present, we almost never skip
  const hasBillSignal = hasBillSignals(subject, body);

  // Check skip keywords in SUBJECT ONLY (not body)
  let skipHit: string | null = null;
  for (const keyword of SKIP_KEYWORDS) {
    if (subjectLower.includes(keyword.toLowerCase())) {
      skipHit = keyword;
      break;
    }
  }

  // Only skip if we have a skip keyword AND no bill signals
  // This allows bill emails that mention past payments to still be processed
  if (skipHit && !hasBillSignal) {
    return {
      shouldSkip: true,
      reason: `Contains skip keyword in SUBJECT: "${skipHit}"`,
      debugInfo: { skipHit, hasBillSignal }
    };
  }

  // Count promotional keywords
  let promoCount = 0;
  for (const keyword of PROMOTIONAL_KEYWORDS) {
    const keywordLower = keyword.toLowerCase();
    if (subjectLower.includes(keywordLower) || bodyLower.includes(keywordLower)) {
      promoCount++;
    }
  }

  // Only skip promotional if 2+ promo keywords AND no bill signals
  if (promoCount >= 2 && !hasBillSignal) {
    return {
      shouldSkip: true,
      reason: `Promotional-heavy (${promoCount} keywords) and no bill signals`,
      debugInfo: { promoCount, hasBillSignal }
    };
  }

  // Strong promotional indicators in subject - but only if no bill signals
  const strongPromoIndicators = [
    '% off', 'discount', 'coupon', 'deal', 'sale',
    'free gift', 'promo code',
    "don't miss", 'limited time', 'act now', 'hurry',
    'left in cart', 'still thinking', 'come back', 'we miss you',
  ];

  if (!hasBillSignal) {
    for (const indicator of strongPromoIndicators) {
      if (subjectLower.includes(indicator)) {
        return {
          shouldSkip: true,
          reason: `Promotional subject contains: "${indicator}"`,
          debugInfo: { indicator, hasBillSignal }
        };
      }
    }
  }

  return { shouldSkip: false, reason: null, debugInfo: { skipHit, promoCount, hasBillSignal } };
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract all candidates from an email
 */
export function extractCandidates(
  from: string,
  subject: string,
  cleanedBody: string
): CandidateExtractionResult {
  const fullText = `${subject} ${cleanedBody}`;

  // Check if should skip
  const skipCheck = checkIfShouldSkip(subject, cleanedBody);

  // Calculate keyword score
  const { score: keywordScore, matchedKeywords } = calculateKeywordScore(subject, cleanedBody);

  // Check for bill signals (for logging)
  const hasBillSignal = hasBillSignals(subject, cleanedBody);

  // If should skip, return early with debug logging
  if (skipCheck.shouldSkip) {
    console.log('[Pipeline] REJECT', JSON.stringify({
      subject: subject.substring(0, 60),
      reason: skipCheck.reason,
      keywordScore: keywordScore.toFixed(3),
      hasBillSignal,
      ...skipCheck.debugInfo,
    }));

    return {
      amounts: [],
      dates: [],
      names: [],
      keywordScore: 0,
      matchedKeywords: [],
      isPromotional: true,
      skipReason: skipCheck.reason,
    };
  }

  // If keyword score too low, return early with debug logging
  if (keywordScore < VALIDATION.confidence.minKeywordScore) {
    console.log('[Pipeline] REJECT', JSON.stringify({
      subject: subject.substring(0, 60),
      reason: `Keyword score ${keywordScore.toFixed(3)} below threshold ${VALIDATION.confidence.minKeywordScore}`,
      keywordScore: keywordScore.toFixed(3),
      matchedKeywords,
      hasBillSignal,
    }));

    return {
      amounts: [],
      dates: [],
      names: [],
      keywordScore,
      matchedKeywords,
      isPromotional: false,
      skipReason: `Keyword score ${keywordScore.toFixed(2)} below threshold ${VALIDATION.confidence.minKeywordScore}`,
    };
  }

  // Extract candidates
  const amounts = extractAmountCandidates(fullText);
  const dates = extractDateCandidates(fullText);
  const names = extractNameCandidates(from, subject, cleanedBody);

  console.log('[Pipeline] PASS', JSON.stringify({
    subject: subject.substring(0, 60),
    keywordScore: keywordScore.toFixed(3),
    matchedKeywords,
    hasBillSignal,
    amountsFound: amounts.length,
    datesFound: dates.length,
    namesFound: names.length,
  }));

  return {
    amounts,
    dates,
    names,
    keywordScore,
    matchedKeywords,
    isPromotional: false,
    skipReason: null,
  };
}
