// Unit tests for account-data storage cleanup (Privacy P1-1).
//
//   node --test lib/account/delete-account-data.test.mjs
//
// .mjs so tsc ignores it; Node strips types from the imported .ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BILL_SCANS_BUCKET,
  SCAN_TELEMETRY_TABLES,
  USER_DATA_TABLES,
  listUserStoragePaths,
  removeUserScanData,
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

// MARK: - removeUserScanData (mobile account-deletion companion cleanup)

// A fake admin client: records `.from(t).delete().eq('user_id', uid)` calls
// and exposes a storage handle backed by makeBucket. Per-table errors can be
// injected by name to exercise the best-effort path.
function makeAdmin(bucket, { tableErrors = {}, tableThrows = {} } = {}) {
  const deleted = [];
  return {
    deleted,
    from(table) {
      return {
        delete() {
          return {
            async eq(column, value) {
              if (tableThrows[table]) throw new Error(tableThrows[table]);
              deleted.push({ table, column, value });
              const message = tableErrors[table] ?? null;
              return { error: message ? { message } : null };
            },
          };
        },
      };
    },
    storage: { from: () => bucket },
  };
}

test('removeUserScanData — deletes every telemetry table + storage for the user', async () => {
  const bucket = makeBucket({ 'user-1': [fileEntry('a.jpg'), fileEntry('b.png')] });
  const admin = makeAdmin(bucket);

  const { storageObjectsRemoved, errors } = await removeUserScanData(admin, 'user-1');

  assert.equal(storageObjectsRemoved, 2);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    admin.deleted.map((d) => d.table),
    [...SCAN_TELEMETRY_TABLES]
  );
  for (const d of admin.deleted) {
    assert.equal(d.column, 'user_id');
    assert.equal(d.value, 'user-1');
  }
  assert.deepEqual(bucket.removed, ['user-1/a.jpg', 'user-1/b.png']);
});

test('removeUserScanData — no data is a clean no-op (0 removed, no errors)', async () => {
  const bucket = makeBucket({ 'user-1': [] });
  const { storageObjectsRemoved, errors } = await removeUserScanData(makeAdmin(bucket), 'user-1');
  assert.equal(storageObjectsRemoved, 0);
  assert.deepEqual(errors, []);
});

test('removeUserScanData — a table error is collected, not thrown, and never blocks the rest', async () => {
  const bucket = makeBucket({ 'user-1': [fileEntry('a.jpg')] });
  const admin = makeAdmin(bucket, { tableErrors: { scan_attempts: 'permission denied' } });

  const { storageObjectsRemoved, errors } = await removeUserScanData(admin, 'user-1');

  // Storage cleanup + the other tables still ran.
  assert.equal(storageObjectsRemoved, 1);
  assert.deepEqual(bucket.removed, ['user-1/a.jpg']);
  assert.equal(admin.deleted.length, SCAN_TELEMETRY_TABLES.length);
  assert.deepEqual(errors, ['scan_attempts: permission denied']);
});

test('removeUserScanData — a thrown table error is caught into errors', async () => {
  const bucket = makeBucket({ 'user-1': [] });
  const admin = makeAdmin(bucket, { tableThrows: { bill_scan_sessions: 'boom' } });
  const { errors } = await removeUserScanData(admin, 'user-1');
  assert.deepEqual(errors, ['bill_scan_sessions: boom']);
});

test('removeUserScanData — a storage failure is collected, not thrown', async () => {
  const bucket = makeBucket({ 'user-1': [fileEntry('a.jpg')] }, { listError: 'storage down' });
  const { storageObjectsRemoved, errors } = await removeUserScanData(makeAdmin(bucket), 'user-1');
  assert.equal(storageObjectsRemoved, 0);
  assert.deepEqual(errors, ['storage: storage list failed: storage down']);
});

test('removeUserScanData — requires a userId', async () => {
  const bucket = makeBucket({});
  await assert.rejects(() => removeUserScanData(makeAdmin(bucket), ''), /userId is required/);
});

test('SCAN_TELEMETRY_TABLES are all listed in USER_DATA_TABLES', () => {
  for (const t of SCAN_TELEMETRY_TABLES) {
    assert.ok(USER_DATA_TABLES.includes(t), `missing ${t}`);
  }
});
