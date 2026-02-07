/**
 * Date Normalization Utilities
 *
 * Uses chrono-node to parse natural language dates from email text
 * and normalize them to YYYY-MM-DD format.
 */

import * as chrono from 'chrono-node';

/**
 * Normalize a raw date string to YYYY-MM-DD format.
 *
 * Handles:
 * - Full dates: "January 25, 2026" -> "2026-01-25"
 * - Short dates: "Jan 25" -> current/next year based on context
 * - Numeric: "01/25/26" -> "2026-01-25"
 * - Relative: "due in 5 days" -> calculated date
 * - ISO format passthrough: "2026-01-25" -> "2026-01-25"
 *
 * @param rawDate - The raw date string from the email
 * @param referenceDate - Reference date for relative calculations (defaults to today)
 * @returns YYYY-MM-DD string or null if parsing fails
 */
export function normalizeDueDate(
  rawDate: string | null | undefined,
  referenceDate?: Date
): string | null {
  if (!rawDate || typeof rawDate !== 'string') {
    return null;
  }

  const trimmed = rawDate.trim();
  if (!trimmed) {
    return null;
  }

  // If already in YYYY-MM-DD format, validate and return
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return trimmed;
    }
  }

  // Use reference date or today
  const refDate = referenceDate || new Date();

  // Parse with chrono-node
  const results = chrono.parse(trimmed, refDate, { forwardDate: true });

  if (results.length === 0) {
    return null;
  }

  // Get the parsed date
  const parsedDate = results[0].start.date();

  // Apply forward-dating logic for ambiguous dates
  // If the parsed date is in the past (more than 7 days ago), assume next occurrence
  const daysDiff = Math.floor(
    (parsedDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let finalDate = parsedDate;

  // If date is more than 7 days in the past and no explicit year was provided,
  // forward it by a year
  if (daysDiff < -7 && !results[0].start.isCertain('year')) {
    finalDate = new Date(parsedDate);
    finalDate.setFullYear(finalDate.getFullYear() + 1);
  }

  // Format as YYYY-MM-DD
  return formatDate(finalDate);
}

/**
 * Format a Date object as YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a string is a valid YYYY-MM-DD date
 */
export function isValidDateFormat(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }

  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime());
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayString(): string {
  return formatDate(new Date());
}
