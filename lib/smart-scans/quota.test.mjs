// Smart Scans quota helper tests.
//
//   node --test lib/smart-scans/quota.test.mjs
//
// Pure quota math only. No routes, migrations, Supabase clients, or live data.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSmartScanLimitReachedResponse,
  calculateSmartScanQuota,
  calculateUsedSmartScanUnits,
  getSmartScanUnitCost,
  resolveSmartScanTier,
} from './quota.ts';

const NOW = new Date('2026-05-26T12:00:00.000Z');

const freeSubscription = {
  subscription_tier: 'free',
  subscription_status: 'free',
};

const proSubscription = {
  subscription_tier: 'pro',
  subscription_status: 'active',
  subscription_expires_at: '2026-06-26T12:00:00.000Z',
};

function charged(units, overrides = {}) {
  return {
    units,
    status: 'charged',
    created_at: '2026-05-10T12:00:00.000Z',
    period_start: '2026-05-01',
    ...overrides,
  };
}

function quota({ subscription = freeSubscription, used = 0, scanKind = 'bill', events = null } = {}) {
  const usageEvents = events ?? (used > 0 ? [charged(used)] : []);
  return calculateSmartScanQuota({
    subscription,
    usageEvents,
    scanKind,
    now: NOW,
  });
}

test('resolves user tier from subscription source', () => {
  assert.equal(resolveSmartScanTier(freeSubscription, NOW), 'free');
  assert.equal(resolveSmartScanTier(proSubscription, NOW), 'pro');
  assert.equal(resolveSmartScanTier({ subscription_tier: 'pro', subscription_status: 'expired' }, NOW), 'free');
  assert.equal(
    resolveSmartScanTier({
      subscription_tier: 'pro',
      subscription_status: 'active',
      subscription_expires_at: '2026-05-01T00:00:00.000Z',
    }, NOW),
    'free',
  );
});

test('scan unit costs are bill=1 and pay_later=2', () => {
  assert.equal(getSmartScanUnitCost('bill'), 1);
  assert.equal(getSmartScanUnitCost('pay_later'), 2);
});

test('Free user with 0 units used can scan a bill', () => {
  const result = quota({ used: 0, scanKind: 'bill' });
  assert.equal(result.tier, 'free');
  assert.equal(result.limit, 2);
  assert.equal(result.used, 0);
  assert.equal(result.remaining, 2);
  assert.equal(result.canScan, true);
  assert.deepEqual(result.period, {
    type: 'lifetime',
    periodStart: null,
    periodEnd: null,
    nextResetAt: null,
  });
});

test('Free user with 1 unit used can scan a bill', () => {
  const result = quota({ used: 1, scanKind: 'bill' });
  assert.equal(result.used, 1);
  assert.equal(result.remaining, 1);
  assert.equal(result.cost, 1);
  assert.equal(result.canScan, true);
});

test('Free user with 2 units used cannot scan', () => {
  const result = quota({ used: 2, scanKind: 'bill' });
  assert.equal(result.used, 2);
  assert.equal(result.remaining, 0);
  assert.equal(result.canScan, false);
});

test('Free user with 0 units used can scan Pay Later if it costs 2', () => {
  const result = quota({ used: 0, scanKind: 'pay_later' });
  assert.equal(result.cost, 2);
  assert.equal(result.remaining, 2);
  assert.equal(result.canScan, true);
});

test('Free user with 1 unit used cannot scan Pay Later if it costs 2', () => {
  const result = quota({ used: 1, scanKind: 'pay_later' });
  assert.equal(result.cost, 2);
  assert.equal(result.remaining, 1);
  assert.equal(result.canScan, false);
});

test('Pro user with 0 units used has 10 remaining', () => {
  const result = quota({ subscription: proSubscription, used: 0, scanKind: 'bill' });
  assert.equal(result.tier, 'pro');
  assert.equal(result.limit, 10);
  assert.equal(result.used, 0);
  assert.equal(result.remaining, 10);
  assert.equal(result.canScan, true);
  assert.deepEqual(result.period, {
    type: 'monthly',
    periodStart: '2026-05-01',
    periodEnd: '2026-06-01',
    nextResetAt: '2026-06-01T00:00:00.000Z',
  });
});

test('Pro user with 9 units used can scan a bill', () => {
  const result = quota({ subscription: proSubscription, used: 9, scanKind: 'bill' });
  assert.equal(result.used, 9);
  assert.equal(result.remaining, 1);
  assert.equal(result.cost, 1);
  assert.equal(result.canScan, true);
});

test('Pro user with 9 units used cannot scan Pay Later', () => {
  const result = quota({ subscription: proSubscription, used: 9, scanKind: 'pay_later' });
  assert.equal(result.used, 9);
  assert.equal(result.remaining, 1);
  assert.equal(result.cost, 2);
  assert.equal(result.canScan, false);
});

test('Pro user with 10 units used cannot scan', () => {
  const result = quota({ subscription: proSubscription, used: 10, scanKind: 'bill' });
  assert.equal(result.used, 10);
  assert.equal(result.remaining, 0);
  assert.equal(result.canScan, false);
});

test('reserved/released events do not count as used', () => {
  const events = [
    charged(1, { status: 'reserved' }),
    charged(2, { status: 'released' }),
  ];

  const result = quota({ events, scanKind: 'bill' });
  assert.equal(result.used, 0);
  assert.equal(result.remaining, 2);
  assert.equal(result.canScan, true);
});

test('only charged events count', () => {
  const events = [
    charged(1),
    charged(2, { status: 'reserved' }),
    charged(1, { status: 'released' }),
    charged(1),
  ];

  assert.equal(calculateUsedSmartScanUnits(events, 'free', NOW), 2);

  const result = quota({ events, scanKind: 'bill' });
  assert.equal(result.used, 2);
  assert.equal(result.remaining, 0);
  assert.equal(result.canScan, false);
});

test('Pro monthly period does not count old-month usage', () => {
  const events = [
    charged(7, {
      created_at: '2026-04-20T12:00:00.000Z',
      period_start: '2026-04-01',
    }),
    charged(3, {
      created_at: '2026-05-05T12:00:00.000Z',
      period_start: '2026-05-01',
    }),
  ];

  const result = quota({ subscription: proSubscription, events, scanKind: 'pay_later' });
  assert.equal(result.used, 3);
  assert.equal(result.remaining, 7);
  assert.equal(result.canScan, true);
});

test('event created_at is used for Pro period when period_start is absent', () => {
  const events = [
    charged(5, {
      created_at: '2026-04-30T23:59:59.000Z',
      period_start: null,
    }),
    charged(4, {
      created_at: '2026-05-01T00:00:00.000Z',
      period_start: null,
    }),
  ];

  const result = quota({ subscription: proSubscription, events, scanKind: 'bill' });
  assert.equal(result.used, 4);
  assert.equal(result.remaining, 6);
});

test('limit reached response exposes the eventual API response shape', () => {
  const result = quota({ used: 2, scanKind: 'bill' });
  const response = buildSmartScanLimitReachedResponse(result);

  assert.equal(response.error, 'smart_scan_limit_reached');
  assert.equal(response.message, 'You are out of Smart Scans.');
  assert.deepEqual(response.smartScans, result);
});
