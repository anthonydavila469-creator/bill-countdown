// Smart Scans route wiring tests.
//
// These pin the launch monetization contract at the route layer:
// the scanner endpoints must use the Smart Scan quota ledger, not a
// blanket Pro-only entitlement check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const billRoute = readFileSync(new URL('../../app/api/bills/scan/route.ts', import.meta.url), 'utf8');
const payLaterRoute = readFileSync(
  new URL('../../app/api/pay-later/scan/route.ts', import.meta.url),
  'utf8',
);

function assertUsesQuotaLedger(source, routeName) {
  for (const symbol of [
    'reserveSmartScanUsage',
    'chargeSmartScanUsageEvent',
    'finishChargedSmartScanUsageEvent',
  ]) {
    assert.match(source, new RegExp(`\\b${symbol}\\b`), `${routeName} should call ${symbol}`);
  }

  assert.doesNotMatch(
    source,
    /\bcanUserRunScans\b|\bscanEntitlementDeniedResponse\b/,
    `${routeName} should not use the removed Pro-only entitlement gate`,
  );
}

test('bill scanner is wired to Smart Scan quota accounting', () => {
  assertUsesQuotaLedger(billRoute, 'bill scanner');
  assert.match(billRoute, /scanKind:\s*'bill'/);
  assert.match(billRoute, /route:\s*'\/api\/bills\/scan'/);
  assert.match(billRoute, /releaseSmartScanUsageEvent/);
});

test('Pay Later scanner is wired to Smart Scan quota accounting', () => {
  assertUsesQuotaLedger(payLaterRoute, 'Pay Later scanner');
  assert.match(payLaterRoute, /scanKind:\s*'pay_later'/);
  assert.match(payLaterRoute, /route:\s*'\/api\/pay-later\/scan'/);
});
