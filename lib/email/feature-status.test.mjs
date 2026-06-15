// Tests that mailbox/email scanning is disabled across every entry point
// (owner decision 2026-06-14). See audits/EMAIL_PRIVACY_READINESS.md.
//
//   node --test lib/email/feature-status.test.mjs
//
// .mjs so tsc ignores it; Node strips types from the imported .ts. Route files
// can't be imported directly here (they use the `@/` alias + Next runtime), so
// they're verified by static source inspection — strong enough to prove they
// delegate to the disabled helper and pull in none of the live email modules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  EMAIL_SCANNING_ENABLED,
  EMAIL_SCANNING_DISABLED_CODE,
  EMAIL_SCANNING_DISABLED_BODY,
  emailScanningDisabledResponse,
} from './feature-status.ts';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(REPO_ROOT, rel), 'utf8');

// Live email modules no disabled route may import — importing one would mean
// the route can still reach mailbox/token/parse logic.
const FORBIDDEN_IMPORTS = [
  '@/lib/email/tokens',
  '@/lib/email/providers',
  '@/lib/email/oauth-state',
  '@/lib/inbound/webhook-handler',
  '@/lib/inbound/inbox-manager',
  '@/lib/sync/auto-sync',
  '@/lib/bill-extraction',
  '@/lib/parser/',
];

// Every public email/mailbox entry point that must now return the disabled
// response (delegating to emailScanningDisabledResponse).
const DISABLED_HELPER_ROUTES = [
  'app/api/gmail/connect/route.ts',
  'app/api/gmail/callback/route.ts',
  'app/api/gmail/sync/route.ts',
  'app/api/gmail/disconnect/route.ts',
  'app/api/email/connect/route.ts',
  'app/api/email/callback/route.ts',
  'app/api/email/connect-password/route.ts',
  'app/api/email/disconnect/route.ts',
  'app/api/inbound/inbox/route.ts',
  'app/api/inbound/bill-email/route.ts',
  'app/api/extraction/process-email/route.ts',
];

test('feature flag is hard off', () => {
  assert.equal(EMAIL_SCANNING_ENABLED, false);
});

test('disabled response is a 404 with the stable app-owned code', async () => {
  const res = emailScanningDisabledResponse();
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('content-type'), 'application/json');
  const body = await res.json();
  assert.equal(body.error, EMAIL_SCANNING_DISABLED_CODE);
  assert.equal(body.error, 'email_scanning_disabled');
  assert.deepEqual(body, EMAIL_SCANNING_DISABLED_BODY);
});

test('every email/mailbox route delegates to the disabled helper', () => {
  for (const rel of DISABLED_HELPER_ROUTES) {
    const src = read(rel);
    assert.match(
      src,
      /from '@\/lib\/email\/feature-status'/,
      `${rel} should import the disabled helper`
    );
    assert.match(
      src,
      /emailScanningDisabledResponse\(\)/,
      `${rel} should return the disabled response`
    );
  }
});

test('no disabled email route imports a live email module', () => {
  for (const rel of DISABLED_HELPER_ROUTES) {
    const src = read(rel);
    for (const forbidden of FORBIDDEN_IMPORTS) {
      assert.ok(
        !src.includes(forbidden),
        `${rel} must not import ${forbidden}`
      );
    }
  }
});

test('inbound webhook no longer captures raw email payloads (P1-3 landmine gone)', () => {
  const src = read('app/api/inbound/bill-email/route.ts');
  assert.ok(!src.includes('raw_preview'), 'raw_preview insert must be removed');
  assert.ok(!src.includes('webhook_debug_logs'), 'webhook_debug_logs write must be removed');
  assert.ok(!src.includes('handleInboundEmail'), 'inbound handler must not be invoked');
});

test('mailbox auto-sync and email-parser learning crons are no-ops', () => {
  const autoSync = read('app/api/cron/auto-sync-bills/route.ts');
  assert.ok(!autoSync.includes('performAutoSync'), 'auto-sync must not run a real sync');
  assert.match(autoSync, /disabled: true/);

  const drift = read('app/api/cron/drift-detection/route.ts');
  assert.ok(!drift.includes('runDriftDetection'), 'drift detection must not run');
  assert.match(drift, /disabled: true/);

  const learning = read('app/api/cron/learning-pass/route.ts');
  assert.ok(!learning.includes('generateCandidateTemplates'), 'learning pass must not run');
  assert.match(learning, /disabled: true/);
});

test('vercel.json schedules no email crons', () => {
  const vercel = read('vercel.json');
  // Full cron paths so e.g. extraction-learning-pass (a scanner cron) doesn't
  // false-match the learning-pass substring.
  for (const cron of ['auto-sync-bills', 'drift-detection', 'learning-pass']) {
    assert.ok(
      !vercel.includes(`/api/cron/${cron}"`),
      `vercel.json must not schedule ${cron}`
    );
  }
  // Sanity: the live screenshot-scanner learning crons are still scheduled.
  assert.ok(vercel.includes('/api/cron/biller-profile-builder'), 'scanner cron should remain');
  assert.ok(vercel.includes('/api/cron/extraction-learning-pass'), 'scanner cron should remain');
});

test('daily-tasks cron no longer invokes mailbox auto-sync', () => {
  const daily = read('app/api/cron/daily-tasks/route.ts');
  assert.ok(!daily.includes('auto-sync-bills'), 'daily-tasks must not call auto-sync-bills');
});
