// Regression test for the /api/bills/[id] IDOR fix: an authenticated
// non-admin user must NOT be able to read, update, or delete another
// user's bill, even on the Bearer path (which uses the RLS-bypassing
// service-role client). These tests fail against the pre-fix route — where
// the queries filtered by bill id only — and pass once each query is also
// scoped by user_id.
//
//   node --test lib/bills-id-ownership.test.mjs
//
// The route imports its Supabase/auth/scheduler deps via the `@/` path
// alias, which plain Node can't resolve. We register an in-thread resolve
// hook that redirects those deps to ./bills-id-test-doubles.mjs, then
// import the REAL route handlers and exercise them.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

import * as doubles from './bills-id-test-doubles.mjs';

const DOUBLES_URL = new URL('./bills-id-test-doubles.mjs', import.meta.url).href;
const REPO_ROOT = new URL('../', import.meta.url); // lib/ -> repo root

// The route's runtime deps redirect to the doubles module (incl. next/server,
// which isn't importable outside Next's bundler); any other @/ specifier maps
// to the repo root (defensive — the route has no others).
const REDIRECT = new Set([
  '@/lib/supabase/server',
  '@/lib/supabase/admin',
  '@/lib/auth/get-authenticated-user',
  '@/lib/notifications/scheduler',
  'next/server',
]);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (REDIRECT.has(specifier)) {
      return { url: DOUBLES_URL, shortCircuit: true };
    }
    if (specifier.startsWith('@/')) {
      return { url: new URL(specifier.slice(2), REPO_ROOT).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

// Import the REAL handlers; their @/ imports now resolve to the doubles.
const { GET, PUT, DELETE } = await import('../app/api/bills/[id]/route.ts');

const ALICE = 'alice-uuid';
const BOB = 'bob-uuid';

const params = (id) => ({ params: Promise.resolve({ id }) });
function req(method, body) {
  const init = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'content-type': 'application/json' };
  }
  return new Request('http://test.local/api/bills/x', init);
}

beforeEach(() => {
  doubles.reset();
  doubles.store.currentUser = { id: ALICE }; // the caller is always Alice
  doubles.store.method = 'bearer';
  doubles.seedBill({ id: 'bob-bill', user_id: BOB, name: 'Bob Electric', amount: 100, due_date: '2026-07-01', is_paid: false });
  doubles.seedBill({ id: 'alice-bill', user_id: ALICE, name: 'Alice Water', amount: 50, due_date: '2026-07-02', is_paid: false });
});

test("GET: Alice cannot read Bob's bill (404, no data leaked)", async () => {
  const res = await GET(req('GET'), params('bob-bill'));
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.ok(body.error, 'returns an error, not bill data');
  assert.equal(body.amount, undefined);
  assert.equal(body.user_id, undefined);
});

test('GET: Alice can read her own bill (200)', async () => {
  const res = await GET(req('GET'), params('alice-bill'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 'alice-bill');
  assert.equal(body.user_id, ALICE);
});

test("PUT: Alice cannot update Bob's bill (404, unchanged)", async () => {
  const res = await PUT(req('PUT', { amount: 999 }), params('bob-bill'));
  assert.equal(res.status, 404);
  assert.equal(doubles.store.bills.get('bob-bill').amount, 100, "Bob's bill must be unchanged");
});

test('PUT: Alice can update her own bill (200, changed)', async () => {
  const res = await PUT(req('PUT', { amount: 75 }), params('alice-bill'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.amount, 75);
  assert.equal(doubles.store.bills.get('alice-bill').amount, 75);
});

test("DELETE: Alice cannot delete Bob's bill (404, still present)", async () => {
  const res = await DELETE(req('DELETE'), params('bob-bill'));
  assert.equal(res.status, 404);
  assert.ok(doubles.store.bills.has('bob-bill'), "Bob's bill must not be deleted");
});

test('DELETE: Alice can delete her own bill (200, removed)', async () => {
  const res = await DELETE(req('DELETE'), params('alice-bill'));
  assert.equal(res.status, 200);
  assert.ok(!doubles.store.bills.has('alice-bill'), "Alice's bill should be deleted");
});
