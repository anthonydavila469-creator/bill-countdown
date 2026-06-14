// Repeatable account-deletion verification (Privacy P1-7).
//
// Proves that NO personal data survives after an account is deleted:
// app rows, scanner telemetry, APNs tokens, Smart Scan usage, and raw
// bill-scan Storage objects — plus that the auth user itself is gone.
//
// Usage (run from the backend repo root):
//
//   node scripts/verify-account-deletion.mjs --user <auth-user-uuid>
//   node scripts/verify-account-deletion.mjs --email <addr>   # pre-delete only
//
// Capture the auth user uuid BEFORE deleting (email lookups fail once the
// auth user is gone — which is exactly what we want to confirm). The script
// reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local,
// so it targets whichever Supabase project that env points at. Run it once
// per project that stores this user's data (see audits/ACCOUNT_DELETE_
// VERIFICATION.md for the two-project note).
//
// Exit code 0 = clean (no residual personal data). Exit code 1 = residue
// found, or a precondition failed. Read-only: it never deletes anything.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import {
  BILL_SCANS_BUCKET,
  USER_DATA_TABLES,
  listUserStoragePaths,
} from '../lib/account/delete-account-data.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--user') args.user = argv[++i];
    else if (a === '--email') args.email = argv[++i];
    else if (a === '--bucket') args.bucket = argv[++i];
    else if (a === '--json') args.json = true;
  }
  return args;
}

// Postgres "undefined table" / "undefined column". A table or column that
// doesn't exist on THIS project is reported as N/A, not as a failure — the
// two projects in play have overlapping but not identical schemas.
const MISSING_SCHEMA_CODES = new Set(['42P01', '42703', 'PGRST205', 'PGRST204']);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bucket = args.bucket ?? BILL_SCANS_BUCKET;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve the target user id.
  let userId = args.user ?? null;
  if (!userId && args.email) {
    userId = await findUserIdByEmail(admin, args.email);
    if (!userId) {
      console.log(`No auth user found for email ${args.email} (already deleted, or never existed).`);
    }
  }
  if (!userId) {
    console.error('Provide --user <uuid> (preferred) or --email <addr>.');
    console.error('Capture the uuid BEFORE deletion; email lookups fail once the auth user is gone.');
    process.exit(1);
  }

  const project = supabaseUrl.replace(/^https?:\/\//, '').replace(/\.supabase\.co.*$/, '');
  console.log(`\nVerifying deletion for user ${userId}`);
  console.log(`Project: ${project}  Bucket: ${bucket}\n`);

  const findings = [];

  // 1. Auth user must be gone.
  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const authPresent = Boolean(authData?.user);
  report('auth.users', authPresent ? 1 : 0, authPresent, findings, args.json);

  // 2. Every personal table must have zero rows for this user.
  for (const table of USER_DATA_TABLES) {
    const { count, error } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      if (MISSING_SCHEMA_CODES.has(error.code)) {
        reportNA(table, args.json);
        continue;
      }
      console.log(`  ! ${table}: query error ${error.code ?? ''} ${error.message}`);
      findings.push(table);
      continue;
    }
    report(table, count ?? 0, (count ?? 0) > 0, findings, args.json);
  }

  // 3. No bill-scan storage objects under <userId>/.
  let storageCount = 0;
  try {
    const paths = await listUserStoragePaths(admin.storage.from(bucket), userId);
    storageCount = paths.length;
    report(`storage:${bucket}/${userId}`, storageCount, storageCount > 0, findings, args.json);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // A non-existent bucket on this project is N/A, not a failure.
    if (/not found|does not exist|bucket/i.test(msg)) {
      reportNA(`storage:${bucket}`, args.json);
    } else {
      console.log(`  ! storage:${bucket}: ${msg}`);
      findings.push(`storage:${bucket}`);
    }
  }

  console.log('');
  if (findings.length === 0) {
    console.log('PASS — no residual personal data found for this user.');
    process.exit(0);
  }
  console.log(`FAIL — residual personal data found in: ${findings.join(', ')}`);
  process.exit(1);
}

function report(label, count, isResidue, findings, json) {
  if (isResidue) findings.push(label);
  const status = isResidue ? 'RESIDUE' : 'clean';
  if (!json) console.log(`  ${isResidue ? '✗' : '✓'} ${label.padEnd(34)} ${String(count).padStart(6)}  ${status}`);
}

function reportNA(label, json) {
  if (!json) console.log(`  · ${label.padEnd(34)} ${'—'.padStart(6)}  n/a (not on this project)`);
}

async function findUserIdByEmail(admin, email) {
  const target = email.toLowerCase();
  // listUsers is paginated; scan until found or exhausted.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (hit) return hit.id;
    if (users.length < 1000) break;
  }
  return null;
}

main().catch((e) => {
  console.error('Verification script failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
