/**
 * Pay Later validation engine.
 *
 * Pure function. Takes the raw `PayLaterScanResult` the vision module
 * returns, then:
 *   1. Sorts installments by due date.
 *   2. Cross-checks totals: `paidToDate + remaining`, `sum of
 *      installments`, and `totalPlanAmount` should agree (within 1 cent).
 *   3. Derives missing totals when at least two of the three are
 *      present.
 *   4. Backfills `nextPaymentAmount` / `nextPaymentDate` from the
 *      earliest unpaid installment when missing.
 *   5. Computes a scanStatus and writes warnings.
 *
 * Cents math throughout — no floats.
 */

import type {
  PayLaterInstallment,
  PayLaterInstallmentStatus,
  PayLaterScanResult,
} from './pay-later-vision';

export type PayLaterScanStatus = 'saved' | 'draft_needs_review' | 'unreadable';

export interface ValidatedPayLaterScanResult extends PayLaterScanResult {
  scanStatus: PayLaterScanStatus;
  validatorVersion: string;
}

export const PAY_LATER_VALIDATOR_VERSION = '2026.05.24-v1';

const UNPAID_STATUSES = new Set<PayLaterInstallmentStatus>([
  'scheduled', 'autopay', 'due', 'late', 'upcoming', 'unknown',
]);

const PAID_STATUSES = new Set<PayLaterInstallmentStatus>([
  'paid', 'processed',
]);

const TOLERANCE_CENTS = 1;

const SCHEDULE_HINT_PATTERN =
  /remaining|schedule|installments?|autopay|next\s*payment/i;

export function validatePayLaterScan(raw: PayLaterScanResult): ValidatedPayLaterScanResult {
  const warnings = [...raw.warnings];
  const missingFields = new Set(raw.missingFields);

  // 1. Sort installments by dueDate (ascending). Rows without a date
  // sink to the bottom so they don't poison ordering.
  const installments = sortInstallments(raw.installments);

  // 2. Compute derived totals.
  let { totalPlanAmountCents, paidToDateCents, remainingBalanceCents } = raw;
  const installmentTotal = sumAllInstallments(installments);
  const unpaidTotal = sumUnpaidInstallments(installments);
  const paidTotal = sumPaidInstallments(installments);

  // Cross-check totals (warn when present but inconsistent).
  if (
    totalPlanAmountCents != null &&
    paidToDateCents != null &&
    remainingBalanceCents != null
  ) {
    const computed = paidToDateCents + remainingBalanceCents;
    if (Math.abs(computed - totalPlanAmountCents) > TOLERANCE_CENTS) {
      warnings.push(
        `Total ${centsToDollars(totalPlanAmountCents)} does not equal paid-to-date (${centsToDollars(paidToDateCents)}) + remaining (${centsToDollars(remainingBalanceCents)}).`,
      );
    }
  }
  if (
    totalPlanAmountCents != null &&
    installmentTotal != null &&
    Math.abs(installmentTotal - totalPlanAmountCents) > TOLERANCE_CENTS
  ) {
    warnings.push(
      `Total ${centsToDollars(totalPlanAmountCents)} does not equal the sum of installments (${centsToDollars(installmentTotal)}).`,
    );
  }

  // Fill missing total when we can derive it from two other signals.
  if (totalPlanAmountCents == null) {
    if (paidToDateCents != null && remainingBalanceCents != null) {
      totalPlanAmountCents = paidToDateCents + remainingBalanceCents;
      warnings.push('Total derived from paid-to-date + remaining balance.');
    } else if (installmentTotal != null) {
      totalPlanAmountCents = installmentTotal;
      warnings.push('Total derived from the installment amounts.');
    } else {
      missingFields.add('totalPlanAmount');
    }
  }

  if (paidToDateCents == null) {
    if (totalPlanAmountCents != null && remainingBalanceCents != null) {
      paidToDateCents = Math.max(0, totalPlanAmountCents - remainingBalanceCents);
    } else if (paidTotal != null) {
      paidToDateCents = paidTotal;
    } else {
      missingFields.add('paidToDate');
    }
  }

  if (remainingBalanceCents == null) {
    if (totalPlanAmountCents != null && paidToDateCents != null) {
      remainingBalanceCents = Math.max(0, totalPlanAmountCents - paidToDateCents);
    } else if (unpaidTotal != null) {
      remainingBalanceCents = unpaidTotal;
    } else {
      missingFields.add('remainingBalance');
    }
  }

  // 3. Next payment: prefer explicit; otherwise earliest unpaid.
  const earliestUnpaid = installments.find(
    (p) => p.dueDate != null && UNPAID_STATUSES.has(p.status),
  );
  let { nextPaymentAmountCents, nextPaymentDate } = raw;
  if (nextPaymentDate == null && earliestUnpaid?.dueDate != null) {
    nextPaymentDate = earliestUnpaid.dueDate;
  }
  if (nextPaymentAmountCents == null && earliestUnpaid?.amountCents != null) {
    nextPaymentAmountCents = earliestUnpaid.amountCents;
  }
  if (nextPaymentDate == null) missingFields.add('nextPaymentDate');
  if (nextPaymentAmountCents == null) missingFields.add('nextPaymentAmount');

  // 4. Incomplete-schedule warning: only one payment but evidence
  // mentions schedule/remaining/installments/autopay/next.
  if (
    installments.length <= 1 &&
    SCHEDULE_HINT_PATTERN.test(raw.evidenceSummary || '')
  ) {
    warnings.push('Only one payment was extracted; this may be an incomplete schedule.');
  }

  // 5. Re-assign sequence numbers so they're chronological 1..N (the
  // model often emits them, but multi-image merges can produce gaps).
  installments.forEach((p, i) => {
    if (p.sequence == null) p.sequence = i + 1;
  });

  // 6. Final classification.
  const noMerchant = raw.merchantName == null && raw.providerNormalized == null;
  const noAmount =
    totalPlanAmountCents == null &&
    remainingBalanceCents == null &&
    paidToDateCents == null &&
    installments.every((p) => p.amountCents == null);
  const noDate =
    nextPaymentDate == null &&
    installments.every((p) => p.dueDate == null);

  const scanStatus: PayLaterScanStatus =
    noMerchant && noAmount && noDate
      ? 'unreadable'
      : missingFields.size > 0 || warnings.length > 0 || raw.confidence < 0.6
        ? 'draft_needs_review'
        : 'saved';

  const needsReview = scanStatus !== 'saved';

  return {
    ...raw,
    installments,
    totalPlanAmountCents,
    paidToDateCents,
    remainingBalanceCents,
    nextPaymentAmountCents,
    nextPaymentDate,
    warnings,
    missingFields: Array.from(missingFields),
    needsReview,
    scanStatus,
    validatorVersion: PAY_LATER_VALIDATOR_VERSION,
  };
}

function sortInstallments(installments: PayLaterInstallment[]): PayLaterInstallment[] {
  return [...installments].sort((a, b) => {
    const ad = a.dueDate ? new Date(`${a.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.dueDate ? new Date(`${b.dueDate}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return (a.sequence ?? 0) - (b.sequence ?? 0);
  });
}

function sumAllInstallments(installments: PayLaterInstallment[]): number | null {
  if (installments.length === 0) return null;
  const amounts = installments.map((p) => p.amountCents).filter((a): a is number => a != null);
  if (amounts.length === 0) return null;
  return amounts.reduce((acc, n) => acc + n, 0);
}

function sumUnpaidInstallments(installments: PayLaterInstallment[]): number | null {
  const amounts = installments
    .filter((p) => UNPAID_STATUSES.has(p.status))
    .map((p) => p.amountCents)
    .filter((a): a is number => a != null);
  if (amounts.length === 0) return null;
  return amounts.reduce((acc, n) => acc + n, 0);
}

function sumPaidInstallments(installments: PayLaterInstallment[]): number | null {
  const amounts = installments
    .filter((p) => PAID_STATUSES.has(p.status))
    .map((p) => p.amountCents)
    .filter((a): a is number => a != null);
  if (amounts.length === 0) return null;
  return amounts.reduce((acc, n) => acc + n, 0);
}

function centsToDollars(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}
