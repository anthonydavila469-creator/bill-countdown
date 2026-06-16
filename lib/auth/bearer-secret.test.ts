import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBearerSecret } from './bearer-secret.ts';

// Regression coverage for P2-2 (RevenueCat webhook) and P2-3 (cron routes):
// the shared bearer-secret check must FAIL CLOSED when the expected secret is
// missing or empty, instead of trusting unauthenticated callers.

test('rejects with 500 missing_secret when secret is undefined', () => {
  const result = checkBearerSecret('Bearer anything', undefined);
  assert.deepEqual(result, { ok: false, status: 500, reason: 'missing_secret' });
});

test('rejects with 500 missing_secret when secret is empty string', () => {
  const result = checkBearerSecret('Bearer ', '');
  assert.deepEqual(result, { ok: false, status: 500, reason: 'missing_secret' });
});

test('rejects with 500 missing_secret even when header is also absent', () => {
  // The dangerous fail-open case: no secret + a "Bearer undefined"-style header.
  const result = checkBearerSecret('Bearer undefined', undefined);
  assert.deepEqual(result, { ok: false, status: 500, reason: 'missing_secret' });
});

test('rejects with 401 unauthorized when header is missing but secret is set', () => {
  const result = checkBearerSecret(null, 'real-secret');
  assert.deepEqual(result, { ok: false, status: 401, reason: 'unauthorized' });
});

test('rejects with 401 unauthorized when header does not match secret', () => {
  const result = checkBearerSecret('Bearer wrong', 'real-secret');
  assert.deepEqual(result, { ok: false, status: 401, reason: 'unauthorized' });
});

test('rejects raw secret without Bearer prefix', () => {
  const result = checkBearerSecret('real-secret', 'real-secret');
  assert.deepEqual(result, { ok: false, status: 401, reason: 'unauthorized' });
});

test('accepts a correct Bearer secret', () => {
  const result = checkBearerSecret('Bearer real-secret', 'real-secret');
  assert.deepEqual(result, { ok: true });
});
