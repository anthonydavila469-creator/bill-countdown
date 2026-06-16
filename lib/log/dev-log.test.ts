import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { devLog, devError } from './dev-log.ts';

// Regression coverage for P2-5: payload-bearing logs must be silenced in
// production so financial / preference data cannot land in runtime logs.

const originalEnv = process.env.NODE_ENV;
const originalLog = console.log;
const originalError = console.error;

// NODE_ENV is typed read-only by Next's env augmentation; cast to set it in tests.
function setNodeEnv(value: string | undefined): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

afterEach(() => {
  setNodeEnv(originalEnv);
  console.log = originalLog;
  console.error = originalError;
});

function capture(fn: () => void): unknown[][] {
  const calls: unknown[][] = [];
  console.log = (...args: unknown[]) => { calls.push(args); };
  console.error = (...args: unknown[]) => { calls.push(args); };
  fn();
  return calls;
}

test('devLog is silenced when NODE_ENV is production', () => {
  setNodeEnv('production');
  const calls = capture(() => devLog('bill payload', { amount: 42 }));
  assert.equal(calls.length, 0);
});

test('devError is silenced when NODE_ENV is production', () => {
  setNodeEnv('production');
  const calls = capture(() => devError('settings body', { user: 'u1' }));
  assert.equal(calls.length, 0);
});

test('devLog emits when NODE_ENV is not production', () => {
  setNodeEnv('development');
  const calls = capture(() => devLog('hello', 1));
  assert.deepEqual(calls, [['hello', 1]]);
});

test('devLog emits in test env (undefined-ish non-production)', () => {
  setNodeEnv('test');
  const calls = capture(() => devLog('x'));
  assert.equal(calls.length, 1);
});
