// Unit tests for the deterministic v2 post-processor (Phase 3).
//
//   node --test lib/bill-scan-v2-postprocess.test.mjs
//
// .mjs so tsc ignores it; Node strips types from the imported .ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  postProcessBillScanV2,
  normalizeVendorBrand,
  detectAccountType,
} from './bill-scan-v2-postprocess.ts';

// A minimal v2 object with everything null/false except the fields a
// test overrides. Mirrors the BillScanV2 shape the mapper produces.
function baseV2(overrides = {}) {
  return {
    scanSessionId: 'sess',
    rawVisibleText: null,
    detectedSubjectText: null,
    detectedSenderName: null,
    detectedSenderDomain: null,
    detectedSmartCardText: null,
    detectedBodyText: null,
    vendorRawName: null,
    vendorBrand: null,
    vendorLegalName: null,
    billDisplayName: null,
    accountType: null,
    serviceCategory: null,
    amountDue: null,
    minimumDue: null,
    statementBalance: null,
    dueDate: null,
    paymentAmount: null,
    paymentDate: null,
    paymentStatus: null,
    documentType: null,
    sourceDocumentType: 'emailScreenshot',
    isBill: true,
    isPaymentConfirmation: null,
    confidence: null,
    fieldConfidence: { vendorName: null, amountDue: null, dueDate: null },
    identityConfidence: null,
    evidence: { vendorText: null, amountText: null, dueDateText: null, rawText: null },
    reviewNeeded: false,
    reviewReason: null,
    warnings: [],
    ...overrides,
  };
}

// --- rule unit checks ------------------------------------------------------

test('normalizeVendorBrand collapses Chase variants', () => {
  assert.equal(normalizeVendorBrand('JPMorgan Chase & Co.'), 'Chase');
  assert.equal(normalizeVendorBrand('JPMorgan Chase'), 'Chase');
  assert.equal(normalizeVendorBrand('JP Morgan Chase'), 'Chase');
  assert.equal(normalizeVendorBrand('Chase Bank'), 'Chase');
  assert.equal(normalizeVendorBrand('Capital One Bank'), 'Capital One');
  assert.equal(normalizeVendorBrand('Comcast Cable'), 'Xfinity');
  assert.equal(normalizeVendorBrand('Some Local Credit Union'), null);
});

test('detectAccountType: credit-card phrases beat auto, smart card excluded', () => {
  assert.equal(detectAccountType('your credit card statement is available')?.type, 'creditCard');
  assert.equal(detectAccountType('minimum due $40')?.type, 'creditCard');
  assert.equal(detectAccountType('your auto account statement is available')?.type, 'autoLoan');
  assert.equal(detectAccountType('car payment due')?.type, 'autoLoan');
  assert.equal(detectAccountType('just a hello message'), null);
});

// --- 1. Chase credit card screenshot ---------------------------------------

test('1. Chase credit card statement -> Chase Credit Card, identity high', () => {
  const v2 = postProcessBillScanV2(baseV2({
    detectedSubjectText: 'Your credit card statement is available',
    detectedBodyText: 'Statement balance $70.00. Minimum due $40.00.',
    detectedSmartCardText: 'JPMorgan Chase & Co. bill',
    vendorRawName: 'JPMorgan Chase & Co.',
    amountDue: 70,
    dueDate: '2026-06-11',
  }));
  assert.equal(v2.vendorBrand, 'Chase');
  assert.equal(v2.vendorLegalName, 'JPMorgan Chase & Co.');
  assert.equal(v2.billDisplayName, 'Chase Credit Card');
  assert.equal(v2.accountType, 'creditCard');
  assert.equal(v2.serviceCategory, 'creditCard');
  assert.equal(v2.identityConfidence, 'high');
  assert.equal(v2.isBill, true);
  assert.equal(v2.isPaymentConfirmation, false);
  assert.equal(v2.reviewNeeded, false);
});

// --- 2. Chase auto screenshot ----------------------------------------------

test('2. Chase auto account statement -> Chase Auto, identity high', () => {
  const v2 = postProcessBillScanV2(baseV2({
    detectedSubjectText: 'Your auto account statement is available',
    detectedBodyText: 'Amount due $266.75.',
    detectedSmartCardText: 'JPMorgan Chase & Co. bill',
    vendorRawName: 'JPMorgan Chase & Co.',
    amountDue: 266.75,
    dueDate: '2026-05-25',
  }));
  assert.equal(v2.vendorBrand, 'Chase');
  assert.equal(v2.vendorLegalName, 'JPMorgan Chase & Co.');
  assert.equal(v2.billDisplayName, 'Chase Auto');
  assert.equal(v2.accountType, 'autoLoan');
  assert.equal(v2.serviceCategory, 'loan');
  assert.equal(v2.identityConfidence, 'high');
  assert.equal(v2.isBill, true);
});

// --- 3. Chase payment confirmation -----------------------------------------

test('3. Chase payment confirmation is not an unpaid bill', () => {
  const v2 = postProcessBillScanV2(baseV2({
    detectedSubjectText: 'Your payment is scheduled',
    detectedBodyText: 'Thank you for scheduling your payment. Effective date June 1, 2026. Payment confirmation #12345.',
    detectedSmartCardText: 'JPMorgan Chase & Co. bill',
    vendorRawName: 'JPMorgan Chase & Co.',
    paymentAmount: 70,
    paymentDate: '2026-06-01',
    amountDue: null,
    dueDate: null,
    isBill: true, // model guessed bill; post-processor must correct
  }));
  assert.equal(v2.isPaymentConfirmation, true);
  assert.equal(v2.isBill, false);
  assert.equal(v2.paymentStatus, 'paymentScheduled');
  assert.equal(v2.vendorBrand, 'Chase');
  // Not a bill -> missing amount/due date must NOT force review.
  assert.equal(v2.reviewNeeded, false);
});

// --- 4. Vendor-only Chase smart card ---------------------------------------

test('4. Vendor-only Chase smart card -> low identity, Chase Bill, no type', () => {
  const v2 = postProcessBillScanV2(baseV2({
    detectedSubjectText: null,
    detectedBodyText: null,
    detectedSmartCardText: 'JPMorgan Chase & Co. bill',
    vendorRawName: 'JPMorgan Chase & Co.',
    amountDue: 70,
    dueDate: '2026-06-11',
  }));
  assert.equal(v2.vendorBrand, 'Chase');
  assert.equal(v2.accountType, null);
  assert.equal(v2.serviceCategory, null);
  assert.equal(v2.billDisplayName, 'Chase Bill');
  assert.equal(v2.identityConfidence, 'low');
  // Must NOT surface the legal name or "Type unknown".
  assert.notEqual(v2.billDisplayName, 'JPMorgan Chase & Co.');
});

// --- 5. Missing amount -----------------------------------------------------

test('5. Missing amount flags review but keeps identity high', () => {
  const v2 = postProcessBillScanV2(baseV2({
    detectedSubjectText: 'Your credit card statement is available',
    detectedSmartCardText: 'JPMorgan Chase & Co. bill',
    vendorRawName: 'JPMorgan Chase & Co.',
    amountDue: null,
    dueDate: '2026-06-11',
  }));
  assert.equal(v2.identityConfidence, 'high');
  assert.equal(v2.accountType, 'creditCard');
  assert.equal(v2.reviewNeeded, true);
  assert.match(v2.reviewReason, /missing amount/);
});

// --- 6. Missing due date ---------------------------------------------------

test('6. Missing due date flags review but keeps identity high', () => {
  const v2 = postProcessBillScanV2(baseV2({
    detectedSubjectText: 'Your auto account statement is available',
    vendorRawName: 'JPMorgan Chase & Co.',
    amountDue: 266.75,
    dueDate: null,
  }));
  assert.equal(v2.identityConfidence, 'high');
  assert.equal(v2.accountType, 'autoLoan');
  assert.equal(v2.reviewNeeded, true);
  assert.match(v2.reviewReason, /missing due date/);
});

// --- idempotency -----------------------------------------------------------

test('post-processing is idempotent', () => {
  const once = postProcessBillScanV2(baseV2({
    detectedSubjectText: 'Your credit card statement is available',
    vendorRawName: 'JPMorgan Chase & Co.',
    amountDue: 70,
    dueDate: '2026-06-11',
  }));
  const twice = postProcessBillScanV2(once);
  assert.deepEqual(twice, once);
});
