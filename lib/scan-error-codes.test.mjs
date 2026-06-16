// Unit tests for the stable scanner error-code mapper (Privacy P1-6).
//
//   node --test lib/scan-error-codes.test.mjs
//
// .mjs so tsc ignores it; Node strips types from the imported .ts.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyScanError,
  scanErrorMessage,
  logScanError,
} from './scan-error-codes.ts';

// A stand-in for the Anthropic SDK error shape: an Error with a numeric
// `.status` and a class-style `.name`.
function apiError(name, status, message = 'raw provider detail with secrets') {
  const e = new Error(message);
  e.name = name;
  if (status !== undefined) e.status = status;
  return e;
}

// MARK: - classifyScanError

test('classifyScanError — timeout by name maps to model_timeout', () => {
  assert.equal(classifyScanError(apiError('APIConnectionTimeoutError', undefined)), 'model_timeout');
  assert.equal(classifyScanError(apiError('RequestTimeoutError', 408)), 'model_timeout');
});

test('classifyScanError — connection error by name maps to network_error', () => {
  assert.equal(classifyScanError(apiError('APIConnectionError', undefined)), 'network_error');
});

test('classifyScanError — 429 maps to model_rate_limited', () => {
  assert.equal(classifyScanError(apiError('RateLimitError', 429)), 'model_rate_limited');
});

test('classifyScanError — 529 maps to model_overloaded', () => {
  assert.equal(classifyScanError(apiError('OverloadedError', 529)), 'model_overloaded');
});

test('classifyScanError — 401/403 map to model_auth_failed', () => {
  assert.equal(classifyScanError(apiError('AuthenticationError', 401)), 'model_auth_failed');
  assert.equal(classifyScanError(apiError('PermissionDeniedError', 403)), 'model_auth_failed');
});

test('classifyScanError — 400/422 map to invalid_image', () => {
  assert.equal(classifyScanError(apiError('BadRequestError', 400)), 'invalid_image');
  assert.equal(classifyScanError(apiError('UnprocessableEntityError', 422)), 'invalid_image');
});

test('classifyScanError — 5xx maps to model_call_failed', () => {
  assert.equal(classifyScanError(apiError('InternalServerError', 500)), 'model_call_failed');
  assert.equal(classifyScanError(apiError('APIError', 503)), 'model_call_failed');
});

test('classifyScanError — unrecognized error maps to unknown_error', () => {
  assert.equal(classifyScanError(new Error('plain error')), 'unknown_error');
  assert.equal(classifyScanError('a string'), 'unknown_error');
  assert.equal(classifyScanError(null), 'unknown_error');
  assert.equal(classifyScanError(undefined), 'unknown_error');
});

// MARK: - scanErrorMessage privacy guarantee

const ALL_CODES = [
  'invalid_image',
  'model_timeout',
  'model_rate_limited',
  'model_overloaded',
  'model_auth_failed',
  'model_call_failed',
  'network_error',
  'unknown_error',
];

test('scanErrorMessage — every code returns non-empty, app-owned copy', () => {
  for (const code of ALL_CODES) {
    const msg = scanErrorMessage(code);
    assert.ok(typeof msg === 'string' && msg.length > 0, `empty message for ${code}`);
    // App-owned copy must never echo raw provider/model identifiers.
    const lower = msg.toLowerCase();
    for (const banned of ['anthropic', 'claude', 'sonnet', 'apierror', 'stack', 'token']) {
      assert.ok(!lower.includes(banned), `message for ${code} leaked "${banned}"`);
    }
  }
});

// MARK: - logScanError

test('logScanError — returns the stable code and never returns raw text', () => {
  const original = console.error;
  let logged = '';
  console.error = (...args) => { logged = args.join(' '); };
  try {
    const secret = 'PROVIDER_SECRET_abc123';
    const code = logScanError('test-scope', apiError('RateLimitError', 429, secret));
    assert.equal(code, 'model_rate_limited');
    // The raw detail belongs ONLY in the controlled server log...
    assert.ok(logged.includes(secret), 'raw detail should reach the server log');
    assert.ok(logged.includes('test-scope'), 'scope should reach the server log');
    // ...and the returned code (what callers persist/return) must not.
    assert.ok(!code.includes(secret), 'returned code leaked raw detail');
  } finally {
    console.error = original;
  }
});
