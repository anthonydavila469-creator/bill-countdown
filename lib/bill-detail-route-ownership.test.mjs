// Regression tests for P1-1 (DEEP_SECURITY_SCAN): the bill detail route
// (GET/PUT/DELETE /api/bills/[id]) must never let a bearer-authenticated caller
// read, update, or delete another user's bill.
//
//   node --test lib/bill-detail-route-ownership.test.mjs
//
// Route files use the `@/` alias + Next runtime, so they can't be imported
// here — they're verified by static source inspection, the same approach as
// lib/email/feature-status.test.mjs and lib/smart-scans/route-wiring.test.mjs.
// The two guarantees we pin:
//   1. Bearer requests use createBearerSupabaseClient(auth), NOT the raw
//      service-role createAdminClient() that bypasses RLS.
//   2. Every GET/PUT/DELETE query is owner-scoped with .eq('user_id', user.id),
//      so ownership holds even if a service-role client is ever used.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeSrc = readFileSync(
  new URL('../app/api/bills/[id]/route.ts', import.meta.url),
  'utf8',
);

// Split the file into its three handler bodies so we can assert each verb is
// individually owner-scoped (a single repo-wide count could be satisfied by one
// handler while another regresses).
function handlerBody(method) {
  const start = routeSrc.indexOf(`export async function ${method}(`);
  assert.notEqual(start, -1, `route should export a ${method} handler`);
  const next = ['GET', 'PUT', 'DELETE']
    .map((m) => routeSrc.indexOf(`export async function ${m}(`, start + 1))
    .filter((i) => i !== -1)
    .sort((a, b) => a - b)[0];
  return routeSrc.slice(start, next === undefined ? routeSrc.length : next);
}

test('bearer requests do not use the RLS-bypassing service-role client', () => {
  // The whole vulnerability was `method === 'bearer' ? createAdminClient() : ...`.
  assert.ok(
    !routeSrc.includes('createAdminClient'),
    'route must not import or call createAdminClient() — use createBearerSupabaseClient(auth)',
  );
  assert.match(
    routeSrc,
    /createBearerSupabaseClient\(auth\)/,
    'bearer branch must use createBearerSupabaseClient(auth)',
  );
});

for (const method of ['GET', 'PUT', 'DELETE']) {
  test(`${method} is owner-scoped with .eq('user_id', user.id)`, () => {
    const body = handlerBody(method);
    assert.match(
      body,
      /\.eq\('user_id', user\.id\)/,
      `${method} must filter by user_id so it cannot touch another user's bill`,
    );
    assert.match(
      body,
      /\.eq\('id', id\)/,
      `${method} must still target the requested bill id`,
    );
  });
}

test('DELETE only cancels notifications after a confirmed owned-row delete', () => {
  const body = handlerBody('DELETE');
  const deleteIdx = body.indexOf('.delete()');
  const cancelIdx = body.indexOf('cancelNotificationsForBill');
  assert.notEqual(deleteIdx, -1, 'DELETE should perform a delete');
  assert.notEqual(cancelIdx, -1, 'DELETE should cancel notifications');
  assert.ok(
    cancelIdx > deleteIdx,
    'notification cancellation must run after the owner-scoped delete, not before',
  );
  // A no-op delete (wrong owner / missing row) must 404, not report success.
  assert.match(
    body,
    /deleted\.length === 0/,
    'DELETE must detect a no-op (non-owned) delete and return 404',
  );
});
