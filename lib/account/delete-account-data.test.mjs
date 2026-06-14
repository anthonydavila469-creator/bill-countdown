// Unit tests for account-data storage cleanup (Privacy P1-1).
//
//   node --test lib/account/delete-account-data.test.mjs
//
// .mjs so tsc ignores it; Node strips types from the imported .ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BILL_SCANS_BUCKET,
  USER_DATA_TABLES,
  listUserStoragePaths,
  removeUserStorageObjects,
} from './delete-account-data.ts';

// A fake `storage.from(bucket)` handle backed by an in-memory map of
// folder -> entries. Each entry is `{ name, id }`; a null id marks a folder
// placeholder (the real Supabase API returns those for nested folders).
function makeBucket(entriesByFolder, { pageSize = 100, listError = null, removeError = null } = {}) {
  const removed = [];
  return {
    removed,
    list: async (path, { limit = pageSize, offset = 0 } = {}) => {
      if (listError) return { data: null, error: { message: listError } };
      const all = entriesByFolder[path] ?? [];
      return { data: all.slice(offset, offset + limit), error: null };
    },
    remove: async (paths) => {
      if (removeError) return { data: null, error: { message: removeError } };
      removed.push(...paths);
      return { data: paths, error: null };
    },
  };
}

function fileEntry(name) {
  return { name, id: `id-${name}` };
}

// MARK: - listUserStoragePaths

test('listUserStoragePaths — returns full <userId>/<name> paths', async () => {
  const bucket = makeBucket({
    'user-1': [fileEntry('a.jpg'), fileEntry('b.png')],
  });
  const paths = await listUserStoragePaths(bucket, 'user-1');
  assert.deepEqual(paths, ['user-1/a.jpg', 'user-1/b.png']);
});

test('listUserStoragePaths — empty folder returns []', async () => {
  const bucket = makeBucket({ 'user-1': [] });
  assert.deepEqual(await listUserStoragePaths(bucket, 'user-1'), []);
});

test('listUserStoragePaths — skips folder placeholders (null id)', async () => {
  const bucket = makeBucket({
    'user-1': [fileEntry('a.jpg'), { name: 'nested', id: null }],
  });
  assert.deepEqual(await listUserStoragePaths(bucket, 'user-1'), ['user-1/a.jpg']);
});

test('listUserStoragePaths — paginates past the page size', async () => {
  // 250 files across 3 pages of 100.
  const files = Array.from({ length: 250 }, (_, i) => fileEntry(`f${i}.jpg`));
  const bucket = makeBucket({ 'user-1': files }, { pageSize: 100 });
  const paths = await listUserStoragePaths(bucket, 'user-1');
  assert.equal(paths.length, 250);
  assert.equal(paths[0], 'user-1/f0.jpg');
  assert.equal(paths[249], 'user-1/f249.jpg');
});

test('listUserStoragePaths — does not leak across users', async () => {
  const bucket = makeBucket({
    'user-1': [fileEntry('mine.jpg')],
    'user-2': [fileEntry('theirs.jpg')],
  });
  assert.deepEqual(await listUserStoragePaths(bucket, 'user-1'), ['user-1/mine.jpg']);
});

test('listUserStoragePaths — throws on list error', async () => {
  const bucket = makeBucket({}, { listError: 'boom' });
  await assert.rejects(() => listUserStoragePaths(bucket, 'user-1'), /storage list failed: boom/);
});

test('listUserStoragePaths — requires a userId', async () => {
  const bucket = makeBucket({});
  await assert.rejects(() => listUserStoragePaths(bucket, ''), /userId is required/);
});

// MARK: - removeUserStorageObjects

test('removeUserStorageObjects — removes every object and reports the count', async () => {
  const bucket = makeBucket({
    'user-1': [fileEntry('a.jpg'), fileEntry('b.png'), fileEntry('c.webp')],
  });
  const { removed } = await removeUserStorageObjects(bucket, 'user-1');
  assert.equal(removed, 3);
  assert.deepEqual(bucket.removed, ['user-1/a.jpg', 'user-1/b.png', 'user-1/c.webp']);
});

test('removeUserStorageObjects — no objects is a no-op returning 0', async () => {
  const bucket = makeBucket({ 'user-1': [] });
  const { removed } = await removeUserStorageObjects(bucket, 'user-1');
  assert.equal(removed, 0);
  assert.deepEqual(bucket.removed, []);
});

test('removeUserStorageObjects — batches large deletes', async () => {
  const files = Array.from({ length: 250 }, (_, i) => fileEntry(`f${i}.jpg`));
  const bucket = makeBucket({ 'user-1': files }, { pageSize: 100 });
  const { removed } = await removeUserStorageObjects(bucket, 'user-1');
  assert.equal(removed, 250);
  assert.equal(bucket.removed.length, 250);
});

test('removeUserStorageObjects — throws on remove error', async () => {
  const bucket = makeBucket({ 'user-1': [fileEntry('a.jpg')] }, { removeError: 'denied' });
  await assert.rejects(() => removeUserStorageObjects(bucket, 'user-1'), /storage remove failed: denied/);
});

// MARK: - shared constants

test('BILL_SCANS_BUCKET matches the scan route bucket name', () => {
  assert.equal(BILL_SCANS_BUCKET, 'bill-scans');
});

test('USER_DATA_TABLES includes the scanner telemetry tables the audit calls out', () => {
  for (const t of ['bill_scan_sessions', 'scan_attempts', 'smart_scan_usage_events', 'apns_tokens']) {
    assert.ok(USER_DATA_TABLES.includes(t), `missing ${t}`);
  }
});
