// Phase 13 — Pay Later validator tests.
//
//   node --test lib/pay-later-validator.test.mjs
//
// Pure validator math. The vision module (Claude call) is intentionally
// not tested here — that requires network access + an Anthropic key.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validatePayLaterScan } from './pay-later-validator.ts';
import {
  PAY_LATER_SCANNER_VERSION,
  PAY_LATER_VISION_MODEL,
} from './pay-later-vision.ts';

// ---------------------------------------------------------------------
// Fixture helper — builds a raw PayLaterScanResult with sensible defaults
// so each test just overrides the bits it cares about.

function raw(overrides = {}) {
  return {
    scanVersion: PAY_LATER_SCANNER_VERSION,
    model: PAY_LATER_VISION_MODEL,
    sourceType: 'app',
    providerName: null,
    providerNormalized: null,
    merchantName: null,
    planName: null,
    orderNumber: null,
    totalPlanAmountCents: null,
    paidToDateCents: null,
    remainingBalanceCents: null,
    nextPaymentAmountCents: null,
    nextPaymentDate: null,
    paymentMethodBrand: null,
    paymentMethodLast4: null,
    installments: [],
    confidence: 0.9,
    needsReview: false,
    missingFields: [],
    warnings: [],
    evidenceSummary: '',
    ...overrides,
  };
}

function installment(overrides = {}) {
  return {
    sequence: null,
    label: null,
    dueDate: null,
    processedDate: null,
    amountCents: null,
    status: 'scheduled',
    isAutopay: null,
    confidence: 0.9,
    evidenceText: null,
    sourceImageIndex: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------
// Core acceptance test: YoungLA / Shop Pay Installments fixture.

test('YoungLA / Shop Pay Installments fixture — full plan validates cleanly', () => {
  const input = raw({
    sourceType: 'mixed',
    providerName: 'Shop Pay Installments',
    providerNormalized: 'shop_pay_installments',
    merchantName: 'YoungLA',
    paidToDateCents: 3700,
    remainingBalanceCents: 11101,
    paymentMethodBrand: 'Visa',
    paymentMethodLast4: '8197',
    installments: [
      installment({ sequence: 1, dueDate: '2026-05-20', amountCents: 3700, status: 'paid', confidence: 0.95 }),
      installment({ sequence: 2, dueDate: '2026-06-04', amountCents: 3700, status: 'autopay', confidence: 0.92 }),
      installment({ sequence: 3, dueDate: '2026-06-18', amountCents: 3700, status: 'autopay', confidence: 0.92 }),
      installment({ sequence: 4, dueDate: '2026-07-02', amountCents: 3701, status: 'autopay', confidence: 0.92 }),
    ],
    confidence: 0.92,
    evidenceSummary: 'Shop Pay Installments plan for YoungLA, four payments.',
  });

  const out = validatePayLaterScan(input);
  assert.equal(out.merchantName, 'YoungLA');
  assert.equal(out.providerNormalized, 'shop_pay_installments');
  assert.equal(out.paidToDateCents, 3700);
  assert.equal(out.remainingBalanceCents, 11101);
  // Total derived from paid + remaining.
  assert.equal(out.totalPlanAmountCents, 14801);
  // Next payment: earliest unpaid (June 4).
  assert.equal(out.nextPaymentDate, '2026-06-04');
  assert.equal(out.nextPaymentAmountCents, 3700);
  assert.equal(out.scanStatus, 'draft_needs_review'); // derived-total warning bumps it
  assert.ok(out.warnings.some((w) => /derived from paid-to-date/i.test(w)));
});

// ---------------------------------------------------------------------
// Derived totals + cross-checks

test('derives totalPlanAmount from installment sum when paid/remaining missing', () => {
  const input = raw({
    installments: [
      installment({ dueDate: '2026-05-20', amountCents: 3700, status: 'paid' }),
      installment({ dueDate: '2026-06-04', amountCents: 3700, status: 'scheduled' }),
      installment({ dueDate: '2026-06-18', amountCents: 3700, status: 'scheduled' }),
      installment({ dueDate: '2026-07-02', amountCents: 3701, status: 'scheduled' }),
    ],
  });
  const out = validatePayLaterScan(input);
  assert.equal(out.totalPlanAmountCents, 14801);
  assert.ok(out.warnings.some((w) => /derived from the installment amounts/i.test(w)));
});

test('cross-check warning when total disagrees with paid + remaining', () => {
  const input = raw({
    totalPlanAmountCents: 20000, // wrong
    paidToDateCents: 3700,
    remainingBalanceCents: 11101, // 3700 + 11101 = 14801, not 20000
  });
  const out = validatePayLaterScan(input);
  assert.ok(out.warnings.some((w) => /does not equal paid-to-date/.test(w)));
  assert.equal(out.scanStatus, 'draft_needs_review');
});

test('cross-check warning when total disagrees with installment sum', () => {
  const input = raw({
    totalPlanAmountCents: 20000,
    installments: [
      installment({ dueDate: '2026-06-04', amountCents: 3700, status: 'scheduled' }),
      installment({ dueDate: '2026-06-18', amountCents: 3700, status: 'scheduled' }),
    ],
  });
  const out = validatePayLaterScan(input);
  assert.ok(out.warnings.some((w) => /does not equal the sum of installments/.test(w)));
});

test('derives paidToDate from total - remaining when paidToDate missing', () => {
  const input = raw({
    totalPlanAmountCents: 14801,
    remainingBalanceCents: 11101,
  });
  const out = validatePayLaterScan(input);
  assert.equal(out.paidToDateCents, 3700);
});

test('derives remainingBalance from total - paidToDate when remainingBalance missing', () => {
  const input = raw({
    totalPlanAmountCents: 14801,
    paidToDateCents: 3700,
  });
  const out = validatePayLaterScan(input);
  assert.equal(out.remainingBalanceCents, 11101);
});

// ---------------------------------------------------------------------
// nextPayment derivation

test('nextPayment derived from earliest unpaid installment when missing', () => {
  const input = raw({
    installments: [
      installment({ dueDate: '2026-05-20', amountCents: 3700, status: 'paid' }),
      installment({ dueDate: '2026-06-04', amountCents: 3700, status: 'autopay' }),
      installment({ dueDate: '2026-06-18', amountCents: 3700, status: 'autopay' }),
    ],
  });
  const out = validatePayLaterScan(input);
  assert.equal(out.nextPaymentDate, '2026-06-04');
  assert.equal(out.nextPaymentAmountCents, 3700);
});

test('installments get re-sorted by dueDate', () => {
  // Intentionally out of order in the input.
  const input = raw({
    installments: [
      installment({ dueDate: '2026-07-02', amountCents: 3701, status: 'scheduled' }),
      installment({ dueDate: '2026-05-20', amountCents: 3700, status: 'paid' }),
      installment({ dueDate: '2026-06-18', amountCents: 3700, status: 'scheduled' }),
      installment({ dueDate: '2026-06-04', amountCents: 3700, status: 'scheduled' }),
    ],
  });
  const out = validatePayLaterScan(input);
  assert.deepEqual(
    out.installments.map((p) => p.dueDate),
    ['2026-05-20', '2026-06-04', '2026-06-18', '2026-07-02'],
  );
  assert.deepEqual(
    out.installments.map((p) => p.sequence),
    [1, 2, 3, 4],
  );
});

// ---------------------------------------------------------------------
// Incomplete-schedule warning

test('warns about incomplete schedule when only one payment but evidence hints at more', () => {
  const input = raw({
    installments: [
      installment({ dueDate: '2026-06-04', amountCents: 3700, status: 'scheduled' }),
    ],
    evidenceSummary: 'Next payment $37.00 on Jun 4. Autopay on. Card ending 8197.',
  });
  const out = validatePayLaterScan(input);
  assert.ok(
    out.warnings.some((w) =>
      /incomplete schedule/i.test(w),
    ),
    `warnings should include incomplete-schedule note; got: ${JSON.stringify(out.warnings)}`,
  );
});

test('no incomplete-schedule warning when evidence does not hint at more payments', () => {
  const input = raw({
    installments: [
      installment({ dueDate: '2026-06-04', amountCents: 3700, status: 'scheduled' }),
    ],
    evidenceSummary: 'One-time charge of $37.',
  });
  const out = validatePayLaterScan(input);
  assert.ok(!out.warnings.some((w) => /incomplete schedule/i.test(w)));
});

// ---------------------------------------------------------------------
// scanStatus classification

test('scanStatus=unreadable when nothing useful is extracted', () => {
  const out = validatePayLaterScan(raw({ confidence: 0.05 }));
  assert.equal(out.scanStatus, 'unreadable');
  assert.equal(out.needsReview, true);
});

test('scanStatus=draft_needs_review when partial data is present', () => {
  const input = raw({
    merchantName: 'YoungLA',
    providerNormalized: 'shop_pay_installments',
    installments: [
      installment({ dueDate: '2026-06-04', amountCents: 3700, status: 'scheduled' }),
    ],
    confidence: 0.4,
  });
  const out = validatePayLaterScan(input);
  // Low confidence pushes us into needs-review, but not unreadable —
  // we have merchant + amount + date.
  assert.equal(out.scanStatus, 'draft_needs_review');
});

test('scanStatus=saved when everything checks out and confidence is high', () => {
  const input = raw({
    sourceType: 'email',
    providerNormalized: 'klarna',
    merchantName: 'Nike',
    totalPlanAmountCents: 14000,
    paidToDateCents: 0,
    remainingBalanceCents: 14000,
    nextPaymentAmountCents: 3500,
    nextPaymentDate: '2026-06-04',
    installments: [
      installment({ dueDate: '2026-06-04', amountCents: 3500, status: 'scheduled', confidence: 0.95 }),
      installment({ dueDate: '2026-06-18', amountCents: 3500, status: 'scheduled', confidence: 0.95 }),
      installment({ dueDate: '2026-07-02', amountCents: 3500, status: 'scheduled', confidence: 0.95 }),
      installment({ dueDate: '2026-07-16', amountCents: 3500, status: 'scheduled', confidence: 0.95 }),
    ],
    confidence: 0.93,
    evidenceSummary: 'Klarna Pay in 4 for Nike.',
  });
  const out = validatePayLaterScan(input);
  assert.equal(out.scanStatus, 'saved');
  assert.equal(out.needsReview, false);
});

// ---------------------------------------------------------------------
// Provider / merchant absence still recoverable

test('absent merchant but present provider keeps draft_needs_review, not unreadable', () => {
  const input = raw({
    providerNormalized: 'affirm',
    installments: [
      installment({ dueDate: '2026-06-04', amountCents: 5500, status: 'scheduled' }),
      installment({ dueDate: '2026-07-04', amountCents: 5500, status: 'scheduled' }),
    ],
    confidence: 0.7,
  });
  const out = validatePayLaterScan(input);
  assert.equal(out.scanStatus, 'draft_needs_review');
});

// ---------------------------------------------------------------------
// One-payment false-total guard

test('single $37 payment with "remaining" / "autopay" wording is flagged as incomplete', () => {
  const input = raw({
    merchantName: 'YoungLA',
    providerNormalized: 'shop_pay_installments',
    installments: [
      installment({ dueDate: '2026-06-04', amountCents: 3700, status: 'autopay' }),
    ],
    remainingBalanceCents: 11101,
    evidenceSummary: 'Remaining $111.01. Next autopay $37.00 on June 4.',
  });
  const out = validatePayLaterScan(input);
  assert.ok(out.warnings.some((w) => /incomplete schedule/i.test(w)));
});
