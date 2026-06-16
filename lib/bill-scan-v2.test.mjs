// Unit tests for the Bill Scan v2 schema builder.
//
// No test framework is configured in this repo (no jest/vitest/tsx).
// These run on Node's built-in test runner with native TypeScript
// stripping (Node >= 23):
//
//   node --test lib/bill-scan-v2.test.mjs
//
// Written as .mjs so tsc (which only type-checks .ts/.tsx/.mts) leaves
// it alone, while Node still strips types from the imported .ts module.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBillScanV2,
  mapSourceDocumentType,
  wantsV2Response,
} from './bill-scan-v2.ts';

const baseInput = {
  scanSessionId: 'sess_123',
  vendorRawName: 'JPMorgan Chase & Co.',
  amountDue: 70,
  dueDate: '2026-06-11',
  documentType: 'credit_card_statement',
  isBill: true,
  sourceType: 'camera',
  rawVisibleText: 'Your credit card statement is available',
  overallConfidence: 0.84,
  fieldConfidence: { vendorName: 0.9, amountDue: 0.89, dueDate: 0.76 },
  evidence: {
    vendorText: 'Chase',
    amountText: 'Total $70.00',
    dueDateText: 'Due Jun 11',
    rawText: 'Your credit card statement is available',
  },
  reviewNeeded: false,
  reviewReason: null,
  warnings: [],
};

test('buildBillScanV2 maps resolved fields straight through', () => {
  const v2 = buildBillScanV2(baseInput);
  assert.equal(v2.scanSessionId, 'sess_123');
  assert.equal(v2.vendorRawName, 'JPMorgan Chase & Co.');
  assert.equal(v2.amountDue, 70);
  assert.equal(v2.dueDate, '2026-06-11');
  assert.equal(v2.documentType, 'credit_card_statement');
  assert.equal(v2.isBill, true);
  assert.equal(v2.confidence, 0.84);
  assert.deepEqual(v2.fieldConfidence, { vendorName: 0.9, amountDue: 0.89, dueDate: 0.76 });
  assert.equal(v2.evidence.amountText, 'Total $70.00');
  assert.equal(v2.rawVisibleText, 'Your credit card statement is available');
  assert.equal(v2.reviewNeeded, false);
  assert.deepEqual(v2.warnings, []);
});

test('buildBillScanV2 nulls fields the pipeline does not yet extract', () => {
  const v2 = buildBillScanV2(baseInput);
  // Phase 1 does no classification — these must be null until Phase 2.
  for (const key of [
    'detectedSubjectText',
    'detectedSenderName',
    'detectedSenderDomain',
    'detectedSmartCardText',
    'detectedBodyText',
    'vendorBrand',
    'vendorLegalName',
    'billDisplayName',
    'accountType',
    'serviceCategory',
    'minimumDue',
    'statementBalance',
    'paymentAmount',
    'paymentDate',
    'paymentStatus',
    'isPaymentConfirmation',
  ]) {
    assert.equal(v2[key], null, `${key} should be null in Phase 1`);
  }
});

test('buildBillScanV2 exposes exactly the Phase 1 field set', () => {
  const v2 = buildBillScanV2(baseInput);
  const expected = [
    'scanSessionId', 'rawVisibleText', 'detectedSubjectText', 'detectedSenderName',
    'detectedSenderDomain', 'detectedSmartCardText', 'detectedBodyText', 'vendorRawName',
    'vendorBrand', 'vendorLegalName', 'billDisplayName', 'accountType', 'serviceCategory',
    'amountDue', 'minimumDue', 'statementBalance', 'dueDate', 'paymentAmount', 'paymentDate',
    'paymentStatus', 'documentType', 'sourceDocumentType', 'isBill', 'isPaymentConfirmation',
    'confidence', 'fieldConfidence', 'identityConfidence', 'evidence', 'reviewNeeded',
    'reviewReason', 'warnings',
  ].sort();
  assert.deepEqual(Object.keys(v2).sort(), expected);
});

test('mapSourceDocumentType is total and deterministic', () => {
  assert.equal(mapSourceDocumentType('camera'), 'scan');
  assert.equal(mapSourceDocumentType('document_scanner'), 'scan');
  assert.equal(mapSourceDocumentType('photo_library'), 'photo');
  assert.equal(mapSourceDocumentType('quick_add'), 'manual');
  assert.equal(mapSourceDocumentType('something_else'), 'unknown');
  assert.equal(mapSourceDocumentType(null), 'unknown');
});

test('reviewReason is carried through when review is needed', () => {
  const v2 = buildBillScanV2({ ...baseInput, reviewNeeded: true, reviewReason: 'rolled_forward_ambiguous_past_due_date' });
  assert.equal(v2.reviewNeeded, true);
  assert.equal(v2.reviewReason, 'rolled_forward_ambiguous_past_due_date');
});

test('wantsV2Response detects ?v=2 query param', () => {
  assert.equal(wantsV2Response('https://www.duezo.app/api/bills/scan?v=2', {}), true);
  assert.equal(wantsV2Response('https://www.duezo.app/api/bills/scan?v=1', {}), false);
  assert.equal(wantsV2Response('https://www.duezo.app/api/bills/scan', {}), false);
});

test('wantsV2Response detects body responseVersion (number, string, snake_case)', () => {
  assert.equal(wantsV2Response('https://x/api', { responseVersion: 2 }), true);
  assert.equal(wantsV2Response('https://x/api', { responseVersion: '2' }), true);
  assert.equal(wantsV2Response('https://x/api', { response_version: 2 }), true);
  assert.equal(wantsV2Response('https://x/api', { responseVersion: 1 }), false);
  assert.equal(wantsV2Response('https://x/api', {}), false);
  assert.equal(wantsV2Response('https://x/api', null), false);
});
