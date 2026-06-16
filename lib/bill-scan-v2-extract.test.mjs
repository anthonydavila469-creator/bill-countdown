// Unit tests for the Bill Scan v2 extraction parser + mapper.
//
// Run on Node's built-in runner with native TypeScript stripping:
//   node --test lib/bill-scan-v2-extract.test.mjs
//
// .mjs so tsc (which only type-checks .ts/.tsx/.mts) ignores it while
// Node still strips types from the imported .ts module.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BILL_SCAN_V2_PROMPT,
  parseBillScanV2Claude,
  mapClaudeV2ToBillScanV2,
} from './bill-scan-v2-extract.ts';

// --- mocked Claude vision outputs ------------------------------------------

// Example 1: Chase credit card, recognized from the subject line
// "Your credit card statement is available" + "minimum due".
const chaseCreditCardJson = JSON.stringify({
  raw_visible_text:
    'Chase <no.reply.alerts@chase.com>\nYour credit card statement is available\nJPMorgan Chase & Co. bill\nStatement balance $70.00\nMinimum due $40.00\nDue date June 11, 2026',
  subject_text: 'Your credit card statement is available',
  sender_name: 'Chase',
  sender_domain: 'chase.com',
  smart_card_text: 'JPMorgan Chase & Co. bill',
  body_text: 'Statement balance $70.00. Minimum due $40.00. Due June 11, 2026.',
  vendor_raw_name: 'JPMorgan Chase & Co.',
  vendor_brand: 'Chase',
  vendor_legal_name: 'JPMorgan Chase & Co.',
  bill_display_name: 'Chase Credit Card',
  account_type: 'creditCard',
  service_category: 'creditCard',
  amount_due: 70.0,
  minimum_due: 40.0,
  statement_balance: 70.0,
  due_date: '2026-06-11',
  payment_amount: null,
  payment_date: null,
  payment_status: 'minimumDue',
  document_type: 'credit_card_statement',
  source_document_type: 'emailScreenshot',
  is_bill: true,
  is_payment_confirmation: false,
  confidence: { vendor: 0.96, account_type: 0.97, amount: 0.92, due_date: 0.86, overall: 0.93 },
  evidence: {
    vendor_text: 'JPMorgan Chase & Co.',
    account_type_text: 'Your credit card statement is available',
    amount_text: 'Statement balance $70.00',
    due_date_text: 'Due date June 11, 2026',
    raw_text: 'credit card statement; minimum due $40; balance $70; due 6/11',
  },
  review_needed: false,
  review_reason: null,
  warnings: [],
});

// Example 2: Chase auto, recognized from the subject line
// "Your auto account statement is available".
const chaseAutoJson = JSON.stringify({
  raw_visible_text:
    'Chase <no.reply.alerts@chase.com>\nYour auto account statement is available\nJPMorgan Chase & Co. bill\nAmount due $266.75\nDue date May 25, 2026',
  subject_text: 'Your auto account statement is available',
  sender_name: 'Chase',
  sender_domain: 'chase.com',
  smart_card_text: 'JPMorgan Chase & Co. bill',
  body_text: 'Amount due $266.75. Due May 25, 2026.',
  vendor_raw_name: 'JPMorgan Chase & Co.',
  vendor_brand: 'Chase',
  vendor_legal_name: 'JPMorgan Chase & Co.',
  bill_display_name: 'Chase Auto',
  account_type: 'autoLoan',
  service_category: 'loan',
  amount_due: 266.75,
  minimum_due: null,
  statement_balance: null,
  due_date: '2026-05-25',
  payment_amount: null,
  payment_date: null,
  payment_status: 'statementReady',
  document_type: 'auto_loan_statement',
  source_document_type: 'emailScreenshot',
  is_bill: true,
  is_payment_confirmation: false,
  confidence: { vendor: 0.96, account_type: 0.95, amount: 0.9, due_date: 0.84, overall: 0.91 },
  evidence: {
    vendor_text: 'JPMorgan Chase & Co.',
    account_type_text: 'Your auto account statement is available',
    amount_text: 'Amount due $266.75',
    due_date_text: 'Due date May 25, 2026',
    raw_text: 'auto account statement; amount due $266.75; due 5/25',
  },
  review_needed: false,
  review_reason: null,
  warnings: [],
});

// --- prompt sanity ---------------------------------------------------------

test('prompt forces full-screenshot OCR and the priority ladder', () => {
  assert.match(BILL_SCAN_V2_PROMPT, /ENTIRE image/);
  assert.match(BILL_SCAN_V2_PROMPT, /Do NOT ignore or crop out the email subject/);
  assert.match(BILL_SCAN_V2_PROMPT, /credit card statement.*creditCard/s);
  assert.match(BILL_SCAN_V2_PROMPT, /auto account statement.*autoLoan/s);
  assert.match(BILL_SCAN_V2_PROMPT, /NEVER infer account_type from the smart card/);
  assert.match(BILL_SCAN_V2_PROMPT, /NEVER output the legal entity name/);
});

// --- parser ----------------------------------------------------------------

test('parser strips code fences and rejects non-objects', () => {
  assert.equal(parseBillScanV2Claude(null), null);
  assert.equal(parseBillScanV2Claude('not json'), null);
  assert.equal(parseBillScanV2Claude('[1,2,3]'), null);
  const fenced = '```json\n{"vendor_brand":"Chase"}\n```';
  assert.equal(parseBillScanV2Claude(fenced)?.vendor_brand, 'Chase');
});

// --- example 1: Chase Credit Card ------------------------------------------

test('maps Chase Credit Card v2 output', () => {
  const parsed = parseBillScanV2Claude(chaseCreditCardJson);
  assert.ok(parsed);
  const v2 = mapClaudeV2ToBillScanV2(parsed, {
    scanSessionId: 'sess_cc',
    fallbackSourceDocumentType: 'photo',
    resolvedAmountDue: 70.0,
    resolvedDueDate: '2026-06-11',
  });

  assert.equal(v2.vendorBrand, 'Chase');
  assert.equal(v2.vendorLegalName, 'JPMorgan Chase & Co.');
  assert.equal(v2.billDisplayName, 'Chase Credit Card');
  assert.equal(v2.accountType, 'creditCard');
  assert.equal(v2.serviceCategory, 'creditCard');
  assert.equal(v2.amountDue, 70.0);
  assert.equal(v2.minimumDue, 40.0);
  assert.equal(v2.statementBalance, 70.0);
  assert.equal(v2.dueDate, '2026-06-11');
  assert.equal(v2.paymentStatus, 'minimumDue');
  assert.equal(v2.isBill, true);
  assert.equal(v2.isPaymentConfirmation, false);
  assert.equal(v2.sourceDocumentType, 'emailScreenshot');
  assert.equal(v2.detectedSubjectText, 'Your credit card statement is available');

  // Requirement: never the legal name / Type unknown / Chase Bill when
  // the account type is visible.
  assert.notEqual(v2.billDisplayName, 'JPMorgan Chase & Co.');
  assert.notEqual(v2.billDisplayName, 'Chase Bill');
  assert.notEqual(v2.billDisplayName, 'Type unknown');
});

// --- example 2: Chase Auto -------------------------------------------------

test('maps Chase Auto v2 output', () => {
  const parsed = parseBillScanV2Claude(chaseAutoJson);
  assert.ok(parsed);
  const v2 = mapClaudeV2ToBillScanV2(parsed, {
    scanSessionId: 'sess_auto',
    fallbackSourceDocumentType: 'scan',
    resolvedAmountDue: 266.75,
    resolvedDueDate: '2026-05-25',
  });

  assert.equal(v2.vendorBrand, 'Chase');
  assert.equal(v2.vendorLegalName, 'JPMorgan Chase & Co.');
  assert.equal(v2.billDisplayName, 'Chase Auto');
  assert.equal(v2.accountType, 'autoLoan');
  assert.equal(v2.serviceCategory, 'loan');
  assert.equal(v2.amountDue, 266.75);
  assert.equal(v2.dueDate, '2026-05-25');
  assert.equal(v2.isBill, true);
  assert.equal(v2.detectedSubjectText, 'Your auto account statement is available');

  assert.notEqual(v2.billDisplayName, 'JPMorgan Chase & Co.');
  assert.notEqual(v2.billDisplayName, 'Chase Bill');
});

// --- validation / coercion -------------------------------------------------

test('invalid enum values map to null; resolved amount/date win', () => {
  const parsed = parseBillScanV2Claude(
    JSON.stringify({
      vendor_brand: 'Chase',
      account_type: 'not_a_real_type',
      service_category: 'bogus',
      payment_status: 'nope',
      source_document_type: 'weird',
      amount_due: '999',
      due_date: '2099-01-01',
      is_bill: true,
    }),
  );
  assert.ok(parsed);
  const v2 = mapClaudeV2ToBillScanV2(parsed, {
    scanSessionId: 's',
    fallbackSourceDocumentType: 'scan',
    resolvedAmountDue: 70,
    resolvedDueDate: '2026-06-11',
  });
  assert.equal(v2.accountType, null);
  assert.equal(v2.serviceCategory, null);
  assert.equal(v2.paymentStatus, null);
  // invalid source_document_type -> falls back to the provided fallback
  assert.equal(v2.sourceDocumentType, 'scan');
  // resolved values win over the model's
  assert.equal(v2.amountDue, 70);
  assert.equal(v2.dueDate, '2026-06-11');
});

test('payment confirmation separates from bills', () => {
  const parsed = parseBillScanV2Claude(
    JSON.stringify({
      vendor_brand: 'Chase',
      is_bill: false,
      is_payment_confirmation: true,
      payment_amount: 70,
      payment_date: '2026-06-01',
      payment_status: 'paymentReceived',
      account_type: 'creditCard',
    }),
  );
  assert.ok(parsed);
  const v2 = mapClaudeV2ToBillScanV2(parsed, {
    scanSessionId: 's',
    fallbackSourceDocumentType: 'photo',
    resolvedAmountDue: null,
    resolvedDueDate: null,
  });
  assert.equal(v2.isBill, false);
  assert.equal(v2.isPaymentConfirmation, true);
  assert.equal(v2.paymentAmount, 70);
  assert.equal(v2.paymentDate, '2026-06-01');
  assert.equal(v2.paymentStatus, 'paymentReceived');
});
