/**
 * Validation and confidence scoring for bill extractions
 * Validates extracted data and adjusts confidence scores
 */

import { Bill } from '@/types';
import {
  AIExtractionResult,
  AmountCandidate,
  DateCandidate,
  ValidationResult,
} from './types';
import { VALIDATION, CONFIDENCE_WEIGHTS } from './constants';

// ============================================================================
// Amount Validation
// ============================================================================

/**
 * Validate an extracted amount
 */
function validateAmount(amount: number | null): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (amount === null) {
    return { valid: true, warnings: ['No amount extracted'], errors: [] };
  }

  if (amount < VALIDATION.amount.min) {
    errors.push(`Amount $${amount.toFixed(2)} is below minimum ($${VALIDATION.amount.min})`);
    return { valid: false, warnings, errors };
  }

  if (amount > VALIDATION.amount.max) {
    errors.push(`Amount $${amount.toFixed(2)} exceeds maximum ($${VALIDATION.amount.max})`);
    return { valid: false, warnings, errors };
  }

  // Warning for suspiciously round amounts
  if (amount > 1000 && amount === Math.floor(amount)) {
    warnings.push(`Amount $${amount} is a round number - verify it's correct`);
  }

  // Warning for very large amounts
  if (amount > 5000) {
    warnings.push(`Amount $${amount.toFixed(2)} is unusually high - verify it's correct`);
  }

  return { valid: true, warnings, errors };
}

// ============================================================================
// Date Validation
// ============================================================================

/**
 * Validate an extracted due date
 */
function validateDueDate(dueDate: string | null): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (dueDate === null) {
    return { valid: true, warnings: ['No due date extracted'], errors: [] };
  }

  const date = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    errors.push(`Invalid date format: ${dueDate}`);
    return { valid: false, warnings, errors };
  }

  const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check if too far in the future
  if (diffDays > VALIDATION.date.maxFutureDays) {
    errors.push(`Due date ${dueDate} is more than ${VALIDATION.date.maxFutureDays} days in the future`);
    return { valid: false, warnings, errors };
  }

  // Check if too far in the past
  if (diffDays < -VALIDATION.date.maxPastDays) {
    errors.push(`Due date ${dueDate} is more than ${VALIDATION.date.maxPastDays} days in the past`);
    return { valid: false, warnings, errors };
  }

  // Warning for past due dates
  if (diffDays < 0) {
    warnings.push(`Due date ${dueDate} is in the past (${Math.abs(diffDays)} days ago)`);
  }

  return { valid: true, warnings, errors };
}

// ============================================================================
// Duplicate Detection
// ============================================================================

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
 * Check if extraction is a duplicate of an existing bill
 */
function checkDuplicate(
  extraction: {
    name: string | null;
    amount: number | null;
    dueDate: string | null;
  },
  existingBills: Bill[]
): {
  isDuplicate: boolean;
  billId?: string;
  reason?: string;
} {
  if (!extraction.name) {
    return { isDuplicate: false };
  }

  const normalizedName = extraction.name.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const bill of existingBills) {
    const billName = bill.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check name similarity
    const nameSimilar =
      normalizedName.includes(billName) ||
      billName.includes(normalizedName) ||
      levenshteinDistance(normalizedName, billName) <= 3;

    if (!nameSimilar) continue;

    // If names match, check amount or due date
    if (extraction.amount !== null && bill.amount !== null) {
      if (Math.abs(extraction.amount - bill.amount) < 0.01) {
        return {
          isDuplicate: true,
          billId: bill.id,
          reason: `Similar to "${bill.name}" with same amount ($${bill.amount})`,
        };
      }
    }

    if (extraction.dueDate && bill.due_date) {
      if (extraction.dueDate === bill.due_date) {
        return {
          isDuplicate: true,
          billId: bill.id,
          reason: `Similar to "${bill.name}" with same due date (${bill.due_date})`,
        };
      }
    }

    // Just name match is also worth noting
    return {
      isDuplicate: true,
      billId: bill.id,
      reason: `Similar name to existing bill "${bill.name}"`,
    };
  }

  return { isDuplicate: false };
}

// ============================================================================
// Confidence Adjustment
// ============================================================================

/**
 * Calculate adjusted confidence scores based on validation and candidate matching
 */
function calculateAdjustedConfidence(
  aiResult: AIExtractionResult,
  candidates: {
    amounts: AmountCandidate[];
    dates: DateCandidate[];
  },
  validation: {
    amountValid: boolean;
    dateValid: boolean;
    amountWarnings: string[];
    dateWarnings: string[];
  }
): {
  overall: number;
  name: number;
  amount: number;
  dueDate: number;
} {
  let nameConf = aiResult.confidence.name;
  let amountConf = aiResult.confidence.amount;
  let dueDateConf = aiResult.confidence.dueDate;

  // Boost if AI agrees with top candidate
  if (aiResult.amount !== null) {
    const topAmountCandidate = candidates.amounts[0];
    if (topAmountCandidate && Math.abs(topAmountCandidate.value - aiResult.amount) < 0.01) {
      amountConf = Math.min(1, amountConf + 0.1);
    }
    // Penalize if amount has validation warnings
    if (!validation.amountValid) {
      amountConf = 0;
    } else if (validation.amountWarnings.length > 0) {
      amountConf = Math.max(0, amountConf - 0.1 * validation.amountWarnings.length);
    }
  }

  if (aiResult.dueDate !== null) {
    const topDateCandidate = candidates.dates[0];
    if (topDateCandidate && topDateCandidate.value === aiResult.dueDate) {
      dueDateConf = Math.min(1, dueDateConf + 0.1);
    }
    // Penalize if date has validation issues
    if (!validation.dateValid) {
      dueDateConf = 0;
    } else if (validation.dateWarnings.length > 0) {
      dueDateConf = Math.max(0, dueDateConf - 0.1 * validation.dateWarnings.length);
    }
  }

  // Calculate weighted overall confidence
  const overall =
    (amountConf * CONFIDENCE_WEIGHTS.amount) +
    (dueDateConf * CONFIDENCE_WEIGHTS.dueDate) +
    (nameConf * CONFIDENCE_WEIGHTS.name) +
    ((aiResult.category ? 0.8 : 0) * CONFIDENCE_WEIGHTS.category);

  return {
    overall: Math.min(1, Math.max(0, overall)),
    name: Math.min(1, Math.max(0, nameConf)),
    amount: Math.min(1, Math.max(0, amountConf)),
    dueDate: Math.min(1, Math.max(0, dueDateConf)),
  };
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate extraction results and calculate final confidence
 */
export function validateExtraction(
  aiResult: AIExtractionResult,
  candidates: {
    amounts: AmountCandidate[];
    dates: DateCandidate[];
  },
  existingBills: Bill[] = []
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate amount
  const amountValidation = validateAmount(aiResult.amount);
  warnings.push(...amountValidation.warnings);
  errors.push(...amountValidation.errors);

  // Validate due date
  const dateValidation = validateDueDate(aiResult.dueDate);
  warnings.push(...dateValidation.warnings);
  errors.push(...dateValidation.errors);

  // Check for duplicates
  const duplicateCheck = checkDuplicate(
    {
      name: aiResult.name,
      amount: aiResult.amount,
      dueDate: aiResult.dueDate,
    },
    existingBills
  );

  if (duplicateCheck.isDuplicate) {
    warnings.push(duplicateCheck.reason || 'Possible duplicate');
  }

  // Calculate adjusted confidence
  const adjustedConfidence = calculateAdjustedConfidence(
    aiResult,
    candidates,
    {
      amountValid: amountValidation.valid,
      dateValid: dateValidation.valid,
      amountWarnings: amountValidation.warnings,
      dateWarnings: dateValidation.warnings,
    }
  );

  // Overall validity
  const isValid = errors.length === 0 && aiResult.isBill;

  return {
    isValid,
    adjustedConfidence,
    warnings,
    errors,
    isDuplicate: duplicateCheck.isDuplicate,
    duplicateBillId: duplicateCheck.billId,
    duplicateReason: duplicateCheck.reason,
  };
}

/**
 * Determine the routing destination based on confidence
 * @param confidence - Overall extraction confidence
 * @param isDuplicate - Whether this is a duplicate of existing bill
 * @param paymentLinkConfidence - Optional payment link confidence (0-1)
 */
export function determineRoute(
  confidence: number,
  isDuplicate: boolean,
  paymentLinkConfidence?: number
): 'auto_accept' | 'needs_review' | 'rejected' {
  // Duplicates always need review
  if (isDuplicate) {
    return 'needs_review';
  }

  if (confidence >= VALIDATION.confidence.autoAcceptThreshold) {
    return 'auto_accept';
  }

  if (confidence >= VALIDATION.confidence.needsReviewThreshold) {
    return 'needs_review';
  }

  // If we have a high-confidence payment link, route to needs_review
  // even if overall confidence is low (for "view online" statement emails)
  if (paymentLinkConfidence && paymentLinkConfidence >= 0.80) {
    return 'needs_review';
  }

  return 'rejected';
}
