import { Bill, RecurrenceInterval } from '@/types';

// Suggestion returned by the detection algorithm
export interface RecurringSuggestion {
  bill: Bill;
  suggestedInterval: RecurrenceInterval;
  confidence: number; // 0-1
  reason: string;
}

// Common recurring service keywords (case-insensitive matching)
const RECURRING_KEYWORDS: { keywords: string[]; interval: RecurrenceInterval; confidence: number }[] = [
  // Streaming services
  { keywords: ['netflix', 'hulu', 'disney', 'disney+', 'hbo', 'max', 'peacock', 'paramount', 'paramount+', 'apple tv', 'appletv'], interval: 'monthly', confidence: 0.95 },
  { keywords: ['spotify', 'apple music', 'youtube music', 'pandora', 'tidal', 'deezer', 'audible'], interval: 'monthly', confidence: 0.95 },
  { keywords: ['amazon prime', 'prime video'], interval: 'monthly', confidence: 0.9 },

  // Cloud storage & services
  { keywords: ['icloud', 'google one', 'google drive', 'dropbox', 'onedrive'], interval: 'monthly', confidence: 0.9 },
  { keywords: ['adobe', 'creative cloud', 'microsoft 365', 'office 365', 'microsoft office'], interval: 'monthly', confidence: 0.9 },

  // Telecom carriers
  { keywords: ['at&t', 'verizon', 't-mobile', 'tmobile', 'sprint', 'comcast', 'xfinity', 'spectrum', 'cox', 'frontier', 'centurylink'], interval: 'monthly', confidence: 0.95 },

  // Utilities
  { keywords: ['electric', 'electricity', 'power', 'energy'], interval: 'monthly', confidence: 0.85 },
  { keywords: ['water', 'water bill', 'sewer'], interval: 'monthly', confidence: 0.85 },
  { keywords: ['gas', 'natural gas'], interval: 'monthly', confidence: 0.85 },
  { keywords: ['internet', 'wifi', 'broadband', 'fiber'], interval: 'monthly', confidence: 0.9 },
  { keywords: ['phone', 'mobile', 'cellular', 'cell phone'], interval: 'monthly', confidence: 0.9 },

  // Housing
  { keywords: ['rent', 'rental'], interval: 'monthly', confidence: 0.95 },
  { keywords: ['mortgage'], interval: 'monthly', confidence: 0.95 },
  { keywords: ['hoa', 'homeowner', 'homeowners association'], interval: 'monthly', confidence: 0.85 },

  // Insurance
  { keywords: ['insurance', 'auto insurance', 'car insurance', 'health insurance', 'life insurance', 'home insurance', 'renters insurance'], interval: 'monthly', confidence: 0.8 },

  // Fitness & memberships
  { keywords: ['gym', 'fitness', 'planet fitness', 'la fitness', 'equinox', '24 hour fitness', 'orangetheory', 'crossfit', 'peloton'], interval: 'monthly', confidence: 0.9 },
  { keywords: ['membership', 'subscription'], interval: 'monthly', confidence: 0.75 },
  { keywords: ['monthly'], interval: 'monthly', confidence: 0.7 },

  // Annual subscriptions
  { keywords: ['annual', 'yearly', 'year subscription'], interval: 'yearly', confidence: 0.85 },
  { keywords: ['amazon prime annual', 'costco', 'sam\'s club', 'bj\'s'], interval: 'yearly', confidence: 0.8 },
];

/**
 * Normalize a bill name for pattern matching
 * Strips numbers, months, and converts to lowercase
 */
function normalizeBillName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\d+/g, '') // Remove numbers
    .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, '') // Remove months
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi, '') // Remove month abbreviations
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1?: string | null, date2?: string | null): number | null {
  if (!date1 || !date2) return null;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return null;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Detect bills that should likely be marked as recurring
 * Uses keyword matching, pattern detection, and amount regularity
 */
export function detectPotentialRecurringBills(bills: Bill[]): RecurringSuggestion[] {
  const suggestions: Map<string, RecurringSuggestion> = new Map();

  // Filter to non-recurring, non-paid bills only
  const eligibleBills = bills.filter(bill => !bill.is_recurring && !bill.is_paid);

  if (eligibleBills.length === 0) {
    return [];
  }

  // Detection 1: Keyword-based heuristics
  for (const bill of eligibleBills) {
    const billName = bill.name?.trim();
    if (!billName) continue;
    const billNameLower = billName.toLowerCase();

    for (const { keywords, interval, confidence } of RECURRING_KEYWORDS) {
      const matched = keywords.some(keyword => billNameLower.includes(keyword.toLowerCase()));

      if (matched) {
        const existingSuggestion = suggestions.get(bill.id);
        // Only add if no existing suggestion or this one has higher confidence
        if (!existingSuggestion || existingSuggestion.confidence < confidence) {
          const matchedKeyword = keywords.find(k => billNameLower.includes(k.toLowerCase()));
          suggestions.set(bill.id, {
            bill,
            suggestedInterval: interval,
            confidence,
            reason: `"${matchedKeyword}" is typically a ${interval} recurring expense`,
          });
        }
        break; // Stop after first match
      }
    }
  }

  // Detection 2: Pattern matching - bills with same normalized name appearing multiple times
  const normalizedGroups: Map<string, Bill[]> = new Map();

  for (const bill of bills) {
    const normalized = normalizeBillName(bill.name);
    if (normalized.length < 2) continue; // Skip very short names

    const group = normalizedGroups.get(normalized) || [];
    group.push(bill);
    normalizedGroups.set(normalized, group);
  }

  for (const [normalizedName, groupBills] of normalizedGroups) {
    if (groupBills.length < 2) continue;

    // Sort by date
    const sortedBills = [...groupBills].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

    // Check if bills are at least 20 days apart (indicating monthly-ish pattern)
    for (let i = 0; i < sortedBills.length - 1; i++) {
      const daysDiff = daysBetween(sortedBills[i].due_date, sortedBills[i + 1].due_date);
      if (daysDiff === null) continue;

      if (daysDiff >= 20) {
        // Determine interval based on gap
        let interval: RecurrenceInterval = 'monthly';
        let confidence = 0.8;

        if (daysDiff >= 350 && daysDiff <= 380) {
          interval = 'yearly';
          confidence = 0.85;
        } else if (daysDiff >= 25 && daysDiff <= 35) {
          interval = 'monthly';
          confidence = 0.85;
        } else if (daysDiff >= 12 && daysDiff <= 16) {
          interval = 'biweekly';
          confidence = 0.8;
        } else if (daysDiff >= 5 && daysDiff <= 9) {
          interval = 'weekly';
          confidence = 0.8;
        }

        // Add suggestion for eligible (non-recurring, non-paid) bills in this group
        for (const bill of groupBills) {
          if (!bill.is_recurring && !bill.is_paid && !suggestions.has(bill.id)) {
            suggestions.set(bill.id, {
              bill,
              suggestedInterval: interval,
              confidence,
              reason: `Found ${groupBills.length} similar bills with "${bill.name}" pattern (~${daysDiff} days apart)`,
            });
          }
        }
      }
    }
  }

  // Detection 3: Amount regularity - same amount appearing with similar names
  const amountGroups: Map<number, Bill[]> = new Map();

  for (const bill of eligibleBills) {
    if (bill.amount === null || !Number.isFinite(bill.amount)) continue;

    // Round to nearest dollar for grouping
    const roundedAmount = Math.round(bill.amount);
    const group = amountGroups.get(roundedAmount) || [];
    group.push(bill);
    amountGroups.set(roundedAmount, group);
  }

  for (const [amount, groupBills] of amountGroups) {
    if (groupBills.length < 2) continue;

    // Check for similar names within the amount group
    for (let i = 0; i < groupBills.length; i++) {
      for (let j = i + 1; j < groupBills.length; j++) {
        const bill1 = groupBills[i];
        const bill2 = groupBills[j];

        const normalized1 = normalizeBillName(bill1.name);
        const normalized2 = normalizeBillName(bill2.name);

        // Check if names are similar (share significant portion)
        const shorter = normalized1.length < normalized2.length ? normalized1 : normalized2;
        const longer = normalized1.length >= normalized2.length ? normalized1 : normalized2;

        if (shorter.length > 2 && longer.includes(shorter)) {
          const daysDiff = daysBetween(bill1.due_date, bill2.due_date);

          if (daysDiff !== null && daysDiff >= 20 && !suggestions.has(bill1.id)) {
            suggestions.set(bill1.id, {
              bill: bill1,
              suggestedInterval: 'monthly',
              confidence: 0.7,
              reason: `Same amount ($${amount}) found in multiple bills with similar name`,
            });
          }
        }
      }
    }
  }

  // Convert to array and sort by confidence (descending)
  const result = Array.from(suggestions.values()).sort((a, b) => b.confidence - a.confidence);

  return result;
}
