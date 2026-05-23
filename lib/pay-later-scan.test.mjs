// Unit tests for the Pay Later scan post-processor (Phase 10).
//
//   node --test lib/pay-later-scan.test.mjs
//
// .mjs so tsc ignores it; Node strips types from the imported .ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyAndExtractPayLater,
  classifyPayLaterScan,
  normalizePayLaterProvider,
  parseScanPurpose,
  wantsV3Response,
} from './pay-later-scan.ts';

// MARK: - Provider normalization

test('normalizePayLaterProvider — Klarna in raw text', () => {
  const provider = normalizePayLaterProvider('Klarna · Pay in 4 · Order #123', null);
  assert.equal(provider?.provider, 'klarna');
  assert.equal(provider?.displayName, 'Klarna');
});

test('normalizePayLaterProvider — Affirm in vendor name', () => {
  const provider = normalizePayLaterProvider(null, 'Affirm');
  assert.equal(provider?.provider, 'affirm');
});

test('normalizePayLaterProvider — Shop Pay Installments powered by Affirm prefers shopPayInstallments', () => {
  const provider = normalizePayLaterProvider('Shop Pay Installments powered by Affirm', 'Shopify');
  assert.equal(provider?.provider, 'shopPayInstallments');
});

test('normalizePayLaterProvider — Cash App Afterpay maps to afterpay', () => {
  const provider = normalizePayLaterProvider('Pay with Cash App Afterpay', null);
  assert.equal(provider?.provider, 'afterpay');
});

test('normalizePayLaterProvider — PayPal Pay in 4 over plain "paypal"', () => {
  const provider = normalizePayLaterProvider('Pay in 4 with PayPal · Sneakers order', null);
  assert.equal(provider?.provider, 'paypalPayIn4');
});

test('normalizePayLaterProvider — Zip / Quadpay', () => {
  assert.equal(normalizePayLaterProvider('Quadpay payment schedule', null)?.provider, 'zip');
});

test('normalizePayLaterProvider — no match returns null', () => {
  assert.equal(normalizePayLaterProvider('AT&T bill due 12/05', 'AT&T'), null);
});

// MARK: - Classification

function input({ rawText, vendorName = null, amountDue = null, dueDate = null, scanPurpose = 'auto' }) {
  return { rawText, vendorName, amountDue, dueDate, scanPurpose };
}

test('classify — Klarna Pay in 4 payment schedule → payLaterPlan', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Klarna · Pay in 4',
        'Purchase at Nike · Order #N4421',
        'Total $220.00',
        'Payment 1: $55.00 - May 14',
        'Payment 2: $55.00 - May 28',
        'Payment 3: $55.00 - June 11',
        'Payment 4: $55.00 - June 25',
        'Card ending 4242 · Autopay on',
      ].join('\n'),
      vendorName: 'Klarna',
      amountDue: 220,
      dueDate: '2026-05-14',
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  const p = out.payLater;
  assert.ok(p);
  assert.equal(p.provider, 'klarna');
  assert.equal(p.providerDisplayName, 'Klarna');
  assert.equal(p.merchantName, 'Nike');
  assert.equal(p.installmentCount, 4);
  // Phase 12: intervalDays is derived from the first two payment dates
  // when the text doesn't explicitly say "every two weeks" — the Klarna
  // schedule's 14-day gap surfaces 14 here.
  assert.equal(p.intervalDays, 14);
  assert.equal(p.paymentMethodLast4, '4242');
  assert.equal(p.isAutopay, true);
  assert.equal(p.payments.length, 4);
  assert.equal(p.payments[0].sequenceNumber, 1);
  assert.equal(p.payments[0].amount, 55);
  assert.equal(p.payments[3].sequenceNumber, 4);
  assert.equal(p.originalAmount, 220);
  assert.equal(p.planType, 'pay_in_4');
});

test('classify — Affirm monthly schedule → payLaterPlan', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Affirm',
        'Purchase from Best Buy',
        'Monthly payments of $90.00',
        '6 payments',
        'Next payment $90.00 on June 1',
      ].join('\n'),
      vendorName: 'Affirm',
      amountDue: 540,
      dueDate: '2026-06-01',
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  const p = out.payLater;
  assert.ok(p);
  assert.equal(p.provider, 'affirm');
  assert.equal(p.merchantName, 'Best Buy');
  assert.equal(p.installmentCount, 6);
  assert.equal(p.intervalDays, 30);
  // Only one payment line shown explicitly — we still surface it so the
  // review sheet has something concrete to display; user fills the rest.
  assert.equal(p.payments.length, 1);
  assert.equal(p.payments[0].amount, 90);
  assert.equal(p.reviewNeeded, true);
});

test('classify — Shop Pay Installments powered by Affirm → shopPayInstallments', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Shop Pay Installments powered by Affirm',
        'Purchase at Allbirds',
        '4 payments of $35.00 every 2 weeks',
        'Next payment $35.00 on May 28',
      ].join('\n'),
      vendorName: 'Shopify',
      amountDue: 140,
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  assert.equal(out.payLater?.provider, 'shopPayInstallments');
  assert.equal(out.payLater?.installmentCount, 4);
  assert.equal(out.payLater?.intervalDays, 14);
  assert.equal(out.payLater?.planType, 'pay_in_4');
});

test('classify — Afterpay payment schedule → payLaterPlan', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Afterpay payment schedule',
        'Purchase from Target',
        'Pay in 4',
        'Payment 1: $30 - Apr 30 (paid)',
        'Payment 2: $30 - May 14',
        'Payment 3: $30 - May 28',
        'Payment 4: $30 - June 11',
      ].join('\n'),
      vendorName: 'Afterpay',
      amountDue: 120,
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  const p = out.payLater;
  assert.ok(p);
  assert.equal(p.provider, 'afterpay');
  assert.equal(p.installmentCount, 4);
  assert.equal(p.payments.length, 4);
  // Payment 1 explicitly marked paid in the raw text.
  assert.equal(p.payments[0].status, 'paid');
});

test('classify — PayPal Pay in 4 → paypalPayIn4', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Pay in 4 with PayPal',
        'Purchase from Sephora',
        'Total $80.00',
        '4 payments of $20.00',
        'Next payment: $20.00 due May 25',
      ].join('\n'),
      amountDue: 80,
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  assert.equal(out.payLater?.provider, 'paypalPayIn4');
  assert.equal(out.payLater?.installmentCount, 4);
  assert.equal(out.payLater?.merchantName, 'Sephora');
});

test('classify — Pay Later payment confirmation does NOT create a plan', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Klarna',
        'Payment confirmation',
        'Thank you for your payment',
        'Amount $55.00 received',
      ].join('\n'),
      amountDue: 55,
    })
  );
  assert.equal(out.classification, 'paymentConfirmation');
  assert.equal(out.payLater, null);
});

test('classify — Klarna receipt that ALSO lists future payments stays a plan', () => {
  // Real Klarna receipts often say "thank you for your payment" AND show
  // the next 3 upcoming payments. That should remain a plan, not a
  // confirmation page.
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Klarna — Pay in 4',
        'Thank you for your payment',
        'Payment 1: $55.00 (paid)',
        'Next payment: $55.00 due May 28',
        'Remaining payments: 3',
      ].join('\n'),
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
});

test('classify — unknown screenshot fallback', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: 'random scenery and a quote about coffee',
      scanPurpose: 'payLater',
    })
  );
  assert.equal(out.classification, 'unknown');
  assert.equal(out.payLater, null);
});

test('classify — scanPurpose:"bill" never returns payLaterPlan', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: 'Klarna · Pay in 4 · Payment 1 $55',
      vendorName: 'Klarna',
      scanPurpose: 'bill',
    })
  );
  assert.equal(out.classification, 'bill');
});

test('classify — scanPurpose:"auto" with bill signal and no Pay Later → bill', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: 'AT&T statement Total Amount Due $142.50 Due Date Apr 12, 2026',
      vendorName: 'AT&T',
      amountDue: 142.5,
      dueDate: '2026-04-12',
      scanPurpose: 'auto',
    })
  );
  assert.equal(out.classification, 'bill');
});

// MARK: - reviewNeeded gating

test('payLater object — review needed when only one payment row is detected', () => {
  // Phase 12 update: a missing merchant alone no longer triggers
  // review when the provider is detected (requirement 8). What still
  // triggers review is an incomplete schedule — one payment line
  // surfaced, but the plan claims more.
  const out = classifyAndExtractPayLater(
    input({
      rawText: 'Klarna · Pay in 4 · 4 payments · Next payment $25 on May 14',
      amountDue: 100,
    })
  );
  assert.equal(out.payLater?.reviewNeeded, true);
  assert.match(out.payLater?.reviewReason ?? '', /schedule/);
});

test('payLater object — high confidence when many signals are present', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Klarna · Pay in 4',
        'Purchase at Nike',
        '4 payments of $55 every 2 weeks',
        'Payment 1: $55 - May 14',
        'Payment 2: $55 - May 28',
        'Card ending 4242 · Autopay',
      ].join('\n'),
      amountDue: 220,
    })
  );
  assert.equal(out.payLater?.extractionConfidence, 'high');
  assert.equal(out.payLater?.reviewNeeded, false);
});

// MARK: - Past-due derivation

test('payLater payments — past-due scheduled payments are flipped to overdue', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getDate()).padStart(2, '0');
  const monthName = yesterday.toLocaleString('en-US', { month: 'short' });
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Klarna · Pay in 4',
        `Payment 1: $25 - ${monthName} ${yesterday.getDate()}`,
        `Payment 2: $25 - ${monthName} ${yesterday.getDate() + 14}`,
      ].join('\n'),
    })
  );
  // First payment is in the past → overdue.
  assert.equal(out.payLater?.payments[0].dueDate?.endsWith(`-${mm}-${dd}`), true);
  assert.equal(out.payLater?.payments[0].status, 'overdue');
});

// MARK: - Request helpers

test('wantsV3Response — body responseVersion: 3', () => {
  assert.equal(wantsV3Response('https://duezo.app/api/bills/scan', { responseVersion: 3 }), true);
});

test('wantsV3Response — string "3" accepted', () => {
  assert.equal(wantsV3Response('https://duezo.app/api/bills/scan', { responseVersion: '3' }), true);
});

test('wantsV3Response — defaults to false', () => {
  assert.equal(wantsV3Response('https://duezo.app/api/bills/scan', { responseVersion: 2 }), false);
  assert.equal(wantsV3Response('https://duezo.app/api/bills/scan', {}), false);
});

test('parseScanPurpose — defaults to bill so existing callers keep working', () => {
  assert.equal(parseScanPurpose({}), 'bill');
  assert.equal(parseScanPurpose(null), 'bill');
});

test('parseScanPurpose — accepts the three valid values', () => {
  assert.equal(parseScanPurpose({ scanPurpose: 'bill' }), 'bill');
  assert.equal(parseScanPurpose({ scanPurpose: 'payLater' }), 'payLater');
  assert.equal(parseScanPurpose({ scanPurpose: 'auto' }), 'auto');
  assert.equal(parseScanPurpose({ scanPurpose: 'garbage' }), 'bill');
});

// MARK: - classifyPayLaterScan direct entry point

test('classifyPayLaterScan — returns same classification as the wrapper', () => {
  const i = input({
    rawText: 'Klarna · Pay in 4 · Payment 1 $25',
    vendorName: 'Klarna',
  });
  assert.equal(classifyPayLaterScan(i), classifyAndExtractPayLater(i).classification);
});

// MARK: - Phase 12 Shop Pay scenarios
//
// Sample text mirrors real shop.app + Shop Pay Installments email
// screenshots so the extractor stays honest about the formats users
// actually capture.

test('Phase 12 — Shop Pay screen with remaining balance and four rows', () => {
  // shop.app screen capture: YoungLA, $111.01 remaining, four rows,
  // first payment paid (checkmark), Autopay • Visa 8197.
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'shop.app',
        'YoungLA',
        'Remaining $111.01',
        '$37.00 scheduled on June 4',
        'Autopay • Visa 8197',
        'May 19  $37.00 ✓',
        'June 4  $37.00',
        'June 18  $37.00',
        'July 2  $37.01',
      ].join('\n'),
      vendorName: 'YoungLA',
      scanPurpose: 'payLater',
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  const p = out.payLater;
  assert.ok(p);
  assert.equal(p.provider, 'shopPayInstallments');
  assert.equal(p.providerDisplayName, 'Shop Pay Installments');
  assert.equal(p.merchantName, 'YoungLA');
  assert.equal(p.remainingBalance, 111.01, 'remainingBalance from "Remaining $111.01"');
  assert.equal(p.paymentMethodLast4, '8197', '"Visa 8197" pattern');
  assert.equal(p.isAutopay, true);
  assert.equal(p.installmentCount, 4);
  assert.equal(p.payments.length, 4);
  assert.equal(p.payments[0].status, 'paid', 'first row has ✓');
  assert.equal(p.payments[0].amount, 37);
  assert.equal(p.payments[1].status, 'scheduled');
  assert.equal(p.payments[2].status, 'scheduled');
  assert.equal(p.payments[3].amount, 37.01, 'last payment has the rounding cent');
  // Original amount is derived from the four installments — Shop Pay
  // screens often hide the original purchase price.
  assert.equal(p.originalAmount, 148.01);
});

test('Phase 12 — Shop Pay email body with "Your payment schedule"', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Your payment schedule',
        "YoungLA has processed your order, and you're all set to pay with Shop Pay Installments.",
        'Paid: May 20, 2026 — $37.00',
        'Autopay: Jun 4, 2026 — $37.00',
        'Autopay: Jun 18, 2026 — $37.00',
        'Autopay: Jul 2, 2026 — $37.01',
        'Need help? support@shop.affirm.com',
      ].join('\n'),
      vendorName: 'YoungLA',
      scanPurpose: 'payLater',
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  const p = out.payLater;
  assert.ok(p);
  // Provider should resolve via "Shop Pay Installments" or "shop.affirm.com"
  // — both signals are present.
  assert.equal(p.provider, 'shopPayInstallments');
  assert.equal(p.merchantName, 'YoungLA');
  assert.equal(p.isAutopay, true);
  assert.equal(p.installmentCount, 4);
  assert.equal(p.payments.length, 4);
  assert.equal(p.payments[0].status, 'paid', 'first row says "Paid:"');
  assert.equal(p.payments[0].dueDate, '2026-05-20');
  assert.equal(p.payments[3].amount, 37.01);
  // No "Remaining $X" line in the email body, so originalAmount is
  // the sum of all installments.
  assert.equal(p.originalAmount, 148.01);
});

test('Phase 12 — Gmail smart bill card alone does NOT create a plan', () => {
  // Smart card text only — no schedule rows, no remaining balance.
  // Should NOT classify as payLaterPlan; iOS will surface a "screenshot
  // the full schedule" prompt instead.
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Shop Pay Installments',
        'Bill scheduled for payment',
        'YoungLA',
      ].join('\n'),
      vendorName: 'YoungLA',
      scanPurpose: 'payLater',
    })
  );
  assert.equal(out.classification, 'unknown');
  assert.equal(out.payLater, null);
});

test('Phase 12 — Gmail smart card PLUS email body schedule creates a plan', () => {
  // The smart card sits at the top of the email; the body below
  // includes the real schedule. The classifier should trust the body
  // and produce a plan regardless of the smart-card phrasing.
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Shop Pay Installments',
        'Bill scheduled for payment',
        'YoungLA',
        '— — — — — —',
        'Your payment schedule',
        'Paid: May 20, 2026 — $37.00',
        'Autopay: Jun 4, 2026 — $37.00',
        'Autopay: Jun 18, 2026 — $37.00',
        'Autopay: Jul 2, 2026 — $37.01',
      ].join('\n'),
      vendorName: 'YoungLA',
      scanPurpose: 'payLater',
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  assert.equal(out.payLater?.payments.length, 4);
  assert.equal(out.payLater?.payments[0].status, 'paid');
});

test('Phase 12 — first payment marked paid via line prefix becomes status=paid', () => {
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Shop Pay Installments',
        'Allbirds',
        'Paid: May 14 — $35.00',
        'Autopay: May 28 — $35.00',
        'Autopay: Jun 11 — $35.00',
        'Autopay: Jun 25 — $35.00',
      ].join('\n'),
      scanPurpose: 'payLater',
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  const p = out.payLater;
  assert.ok(p);
  assert.equal(p.payments[0].status, 'paid');
  assert.equal(p.payments[1].status, 'scheduled');
  assert.equal(p.payments[2].status, 'scheduled');
  assert.equal(p.payments[3].status, 'scheduled');
});

test('Phase 12 — missing original amount still produces a draft', () => {
  // Only the schedule rows are visible — no "Total $X" anywhere. The
  // extractor should derive originalAmount from the sum of installment
  // amounts and surface the draft instead of failing.
  const out = classifyAndExtractPayLater(
    input({
      rawText: [
        'Shop Pay Installments',
        'YoungLA',
        'May 19 — $37.00',
        'Jun 4 — $37.00',
        'Jun 18 — $37.00',
        'Jul 2 — $37.01',
      ].join('\n'),
      vendorName: 'YoungLA',
      // amountDue intentionally not set.
      scanPurpose: 'payLater',
    })
  );
  assert.equal(out.classification, 'payLaterPlan');
  const p = out.payLater;
  assert.ok(p);
  assert.equal(p.payments.length, 4);
  assert.equal(p.originalAmount, 148.01, 'sum of all installment amounts');
});

test('Phase 12 — provider URL alone (shop.app) detects Shop Pay Installments', () => {
  const provider = normalizePayLaterProvider('Order from shop.app', null);
  assert.equal(provider?.provider, 'shopPayInstallments');
  assert.equal(provider?.displayName, 'Shop Pay Installments');
});

test('Phase 12 — "Installments provided by Affirm" disambiguates Shop Pay', () => {
  const provider = normalizePayLaterProvider('Installments provided by Affirm', null);
  assert.equal(provider?.provider, 'shopPayInstallments');
});
