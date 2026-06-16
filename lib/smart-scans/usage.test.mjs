// Smart Scans usage-event helper tests.
//
//   node --test lib/smart-scans/usage.test.mjs
//
// Mocked Supabase only. No live database, routes, migrations, or production data.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  chargeSmartScanUsageEvent,
  getSmartScanQuotaSnapshot,
  releaseSmartScanUsageEvent,
  reserveSmartScanUsage,
} from './usage.ts';

const NOW = new Date('2026-05-26T12:00:00.000Z');
const USER_ID = 'user_123';

const freePrefs = {
  user_id: USER_ID,
  subscription_tier: 'free',
  subscription_status: 'free',
  subscription_expires_at: null,
  subscription_current_period_end: null,
  is_pro: false,
};

const proPrefs = {
  user_id: USER_ID,
  subscription_tier: 'pro',
  subscription_status: 'active',
  subscription_expires_at: '2026-06-26T12:00:00.000Z',
  subscription_current_period_end: null,
  is_pro: true,
};

function charged(units, overrides = {}) {
  return eventRow({
    status: 'charged',
    units,
    period_start: '2026-05-01',
    ...overrides,
  });
}

function eventRow(overrides = {}) {
  return {
    id: overrides.id ?? `seed_${Math.random().toString(16).slice(2)}`,
    user_id: USER_ID,
    created_at: '2026-05-10T12:00:00.000Z',
    period_start: null,
    scan_kind: 'bill',
    units: 1,
    route: '/api/bills/scan',
    status: 'reserved',
    charge_reason: null,
    model_provider: null,
    model_name: null,
    model_call_started_at: null,
    model_call_finished_at: null,
    bill_scan_session_id: null,
    pay_later_scan_attempt_id: null,
    idempotency_key: null,
    error_code: null,
    image_count: null,
    file_size_bytes: null,
    latency_ms: null,
    ...overrides,
  };
}

function createMockSupabase({ prefs = freePrefs, events = [] } = {}) {
  return new MockSupabase({
    user_preferences: prefs ? [prefs] : [],
    smart_scan_usage_events: [...events],
  });
}

test('reserve allowed bill scan', async () => {
  const supabase = createMockSupabase();

  const result = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'bill',
    route: '/api/bills/scan',
    idempotencyKey: 'scan_1',
    imageCount: 1,
    fileSizeBytes: 12345,
    now: NOW,
    supabase,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 'reserved');
  assert.equal(result.event.status, 'reserved');
  assert.equal(result.event.units, 1);
  assert.equal(result.event.period_start, null);
  assert.equal(result.event.idempotency_key, 'scan_1');
  assert.equal(result.event.image_count, 1);
  assert.equal(result.event.file_size_bytes, 12345);
  assert.equal(supabase.tables.smart_scan_usage_events.length, 1);
});

test('reserve denied free user over limit', async () => {
  const supabase = createMockSupabase({
    events: [charged(1), charged(1)],
  });

  const result = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'bill',
    route: '/api/bills/scan',
    now: NOW,
    supabase,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'limit_reached');
  assert.equal(result.quota.remaining, 0);
  assert.equal(result.limitResponse.error, 'smart_scan_limit_reached');
  assert.equal(supabase.tables.smart_scan_usage_events.length, 2);
});

test('reserve denied Pro user with only 1 unit left trying Pay Later', async () => {
  const supabase = createMockSupabase({
    prefs: proPrefs,
    events: [charged(9)],
  });

  const result = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'pay_later',
    route: '/api/pay-later/scan',
    now: NOW,
    supabase,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 'limit_reached');
  assert.equal(result.quota.tier, 'pro');
  assert.equal(result.quota.remaining, 1);
  assert.equal(result.quota.cost, 2);
  assert.equal(supabase.tables.smart_scan_usage_events.length, 1);
});

test('charge reserved event', async () => {
  const supabase = createMockSupabase();
  const reserved = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'bill',
    route: '/api/bills/scan',
    now: NOW,
    supabase,
  });

  assert.equal(reserved.ok, true);

  const chargedEvent = await chargeSmartScanUsageEvent({
    userId: USER_ID,
    eventId: reserved.event.id,
    modelProvider: 'anthropic',
    modelName: 'claude-sonnet-4-20250514',
    chargeReason: 'model_call_started',
    now: NOW,
    supabase,
  });

  assert.equal(chargedEvent.status, 'charged');
  assert.equal(chargedEvent.model_provider, 'anthropic');
  assert.equal(chargedEvent.model_name, 'claude-sonnet-4-20250514');
  assert.equal(chargedEvent.charge_reason, 'model_call_started');
  assert.equal(chargedEvent.model_call_started_at, NOW.toISOString());
});

test('release reserved event', async () => {
  const supabase = createMockSupabase();
  const reserved = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'bill',
    route: '/api/bills/scan',
    now: NOW,
    supabase,
  });

  const released = await releaseSmartScanUsageEvent({
    userId: USER_ID,
    eventId: reserved.event.id,
    errorCode: 'image_upload_failed',
    now: NOW,
    supabase,
  });

  assert.equal(released.ok, true);
  assert.equal(released.status, 'released');
  assert.equal(released.event.status, 'released');
  assert.equal(released.event.error_code, 'image_upload_failed');
});

test('released events do not count', async () => {
  const supabase = createMockSupabase({
    events: [
      eventRow({ status: 'released', units: 2 }),
      eventRow({ status: 'reserved', units: 1 }),
    ],
  });

  const quota = await getSmartScanQuotaSnapshot({
    userId: USER_ID,
    scanKind: 'pay_later',
    now: NOW,
    supabase,
  });

  assert.equal(quota.used, 0);
  assert.equal(quota.remaining, 2);
  assert.equal(quota.canScan, true);
});

test('idempotency key prevents duplicate reservation/charge behavior', async () => {
  const supabase = createMockSupabase();

  const first = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'bill',
    route: '/api/bills/scan',
    idempotencyKey: 'same_scan',
    now: NOW,
    supabase,
  });
  assert.equal(first.ok, true);

  await chargeSmartScanUsageEvent({
    userId: USER_ID,
    eventId: first.event.id,
    modelProvider: 'anthropic',
    modelName: 'claude-sonnet-4-20250514',
    now: NOW,
    supabase,
  });

  const retry = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'bill',
    route: '/api/bills/scan',
    idempotencyKey: 'same_scan',
    now: NOW,
    supabase,
  });

  assert.equal(retry.ok, true);
  assert.equal(retry.status, 'already_charged');
  assert.equal(retry.event.id, first.event.id);
  assert.equal(supabase.tables.smart_scan_usage_events.length, 1);
});

test('failure before model call releases', async () => {
  const supabase = createMockSupabase();
  const reserved = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'bill',
    route: '/api/bills/scan',
    now: NOW,
    supabase,
  });

  const released = await releaseSmartScanUsageEvent({
    userId: USER_ID,
    eventId: reserved.event.id,
    errorCode: 'invalid_image',
    now: NOW,
    supabase,
  });

  assert.equal(released.ok, true);
  assert.equal(supabase.tables.smart_scan_usage_events[0].status, 'released');
});

test('failure after model call remains charged', async () => {
  const supabase = createMockSupabase();
  const reserved = await reserveSmartScanUsage({
    userId: USER_ID,
    scanKind: 'pay_later',
    route: '/api/pay-later/scan',
    now: NOW,
    supabase,
  });

  const chargedEvent = await chargeSmartScanUsageEvent({
    userId: USER_ID,
    eventId: reserved.event.id,
    modelProvider: 'anthropic',
    modelName: 'claude-sonnet-4-6',
    now: NOW,
    supabase,
  });

  const released = await releaseSmartScanUsageEvent({
    userId: USER_ID,
    eventId: chargedEvent.id,
    errorCode: 'model_parse_failed',
    now: NOW,
    supabase,
  });

  assert.equal(released.ok, false);
  assert.equal(released.status, 'already_charged');
  assert.equal(released.event.status, 'charged');
  assert.equal(supabase.tables.smart_scan_usage_events[0].status, 'charged');
});

class MockSupabase {
  constructor(tables) {
    this.tables = tables;
    this.nextId = 1;
  }

  from(table) {
    if (!this.tables[table]) {
      this.tables[table] = [];
    }
    return new MockQuery(this, table);
  }
}

class MockQuery {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.operation = 'select';
    this.payload = null;
    this.filters = [];
  }

  select() {
    return this;
  }

  insert(payload) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, value });
    return this;
  }

  async maybeSingle() {
    const response = await this.execute();
    if (response.error) return response;
    const rows = Array.isArray(response.data) ? response.data : [];
    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    const response = await this.execute();
    if (response.error) return response;
    const rows = Array.isArray(response.data) ? response.data : [];
    return rows.length === 1
      ? { data: rows[0], error: null }
      : { data: null, error: { message: `Expected one row, got ${rows.length}` } };
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    if (this.operation === 'insert') {
      return this.executeInsert();
    }
    if (this.operation === 'update') {
      return this.executeUpdate();
    }
    return { data: this.filteredRows(), error: null };
  }

  executeInsert() {
    const table = this.client.tables[this.table];
    const payload = { ...this.payload };

    if (this.table === 'smart_scan_usage_events' && payload.idempotency_key) {
      const duplicate = table.find(
        (row) => row.user_id === payload.user_id && row.idempotency_key === payload.idempotency_key,
      );
      if (duplicate) {
        return { data: null, error: { code: '23505', message: 'duplicate idempotency key' } };
      }
    }

    const row = this.table === 'smart_scan_usage_events'
      ? eventRow({
          id: `event_${this.client.nextId++}`,
          created_at: NOW.toISOString(),
          ...payload,
        })
      : {
          id: `row_${this.client.nextId++}`,
          ...payload,
        };

    table.push(row);
    return { data: [row], error: null };
  }

  executeUpdate() {
    const rows = this.filteredRows();
    for (const row of rows) {
      Object.assign(row, this.payload);
    }
    return { data: rows, error: null };
  }

  filteredRows() {
    return this.client.tables[this.table].filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value),
    );
  }
}
