// Reusable account-data cleanup + verification helpers (Privacy P1-1 / P1-7).
//
// The account-delete route (app/api/account/delete/route.ts) deletes a
// curated set of tables and then deletes the auth user, which cascades the
// rest. But Supabase Storage objects are NOT removed by an auth.users
// cascade: deleting a row in storage.objects via SQL would only orphan the
// underlying blob, and the FK on storage.objects is not a delete-cascade
// from auth.users anyway. So raw bill-scan images would survive account
// deletion as private-but-forgotten files. These helpers remove them
// through the Storage API (service role) and give the verification script
// (scripts/verify-account-deletion.mjs) one shared source of truth for
// which prefix and which tables hold personal data.

// Private bucket the bill scan route uploads raw screenshots into.
// Layout is flat: `<userId>/<scanSessionId>.<ext>`.
export const BILL_SCANS_BUCKET = 'bill-scans';

// Personal-data tables in the scan/backend Supabase project that key off
// auth.users via a `user_id` column. Most already cascade on auth.users
// delete; we list them so account deletion can be made explicit and so the
// verification script can prove zero residual rows. Tables that key off a
// parent row instead of user_id directly (e.g. bill_extraction_results via
// scan_session_id, scan_corrections via scan_attempt_id) are intentionally
// omitted here — they cascade from their parent, which is in this list.
export const USER_DATA_TABLES = [
  'bill_notifications_queue',
  'push_subscriptions',
  'bill_extractions',
  'bill_corrections',
  'bill_scan_sessions',
  'scan_attempts',
  'smart_scan_usage_events',
  'installment_payments',
  'installment_plans',
  'ignored_suggestions',
  'learning_events',
  'bill_reviews',
  'email_parse_runs',
  'emails_raw',
  'gmail_tokens',
  'sent_reminders',
  'sent_push_reminders',
  'sync_logs',
  'user_inboxes',
  'bills',
  'user_preferences',
  'apns_tokens',
] as const;

// Scanner telemetry tables that key off the auth user via `user_id`, in the
// project that owns the bill-scans bucket. These already cascade on an
// auth.users delete, but the iOS delete path can't reach this project's
// auth.users (the user's auth lives in the duezo project), so the mobile
// scan-data cleanup route deletes them explicitly. Child rows
// (bill_extraction_results via scan_session_id, scan_corrections via
// scan_attempt_id) cascade from these parents.
export const SCAN_TELEMETRY_TABLES = [
  'scan_attempts',
  'bill_scan_sessions',
  'smart_scan_usage_events',
] as const;

// Minimal shape of a `supabase.storage.from(bucket)` handle — only the two
// methods we use, so the helpers are unit-testable with a fake.
export interface StorageBucketLike {
  list(
    path: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    data: { name: string; id: string | null }[] | null;
    error: { message: string } | null;
  }>;
  remove(
    paths: string[]
  ): Promise<{ data: unknown; error: { message: string } | null }>;
}

const STORAGE_PAGE_SIZE = 100;

// Lists every object owned by `userId` under the bucket, as full storage
// paths (`<userId>/<name>`). Paginates defensively in case a user
// accumulated many scans. The scan route never nests below the user folder,
// so folder placeholders (entries with a null `id`) are skipped rather than
// recursed into.
export async function listUserStoragePaths(
  bucket: StorageBucketLike,
  userId: string
): Promise<string[]> {
  if (!userId) throw new Error('listUserStoragePaths: userId is required');

  const paths: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await bucket.list(userId, {
      limit: STORAGE_PAGE_SIZE,
      offset,
    });
    if (error) throw new Error(`storage list failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      // Skip folder placeholders — only real files have an id.
      if (entry.id === null) continue;
      paths.push(`${userId}/${entry.name}`);
    }

    if (data.length < STORAGE_PAGE_SIZE) break;
    offset += STORAGE_PAGE_SIZE;
  }

  return paths;
}

// Removes every storage object owned by `userId`. Returns the number of
// objects removed. Safe to call when the user has no objects (returns 0).
export async function removeUserStorageObjects(
  bucket: StorageBucketLike,
  userId: string
): Promise<{ removed: number }> {
  const paths = await listUserStoragePaths(bucket, userId);
  if (paths.length === 0) return { removed: 0 };

  let removed = 0;
  for (let i = 0; i < paths.length; i += STORAGE_PAGE_SIZE) {
    const batch = paths.slice(i, i + STORAGE_PAGE_SIZE);
    const { error } = await bucket.remove(batch);
    if (error) throw new Error(`storage remove failed: ${error.message}`);
    removed += batch.length;
  }

  return { removed };
}

// Minimal shape of the admin Supabase client used by the scan-data cleanup:
// a `.from(table).delete().eq(col, val)` chain plus a storage handle. Keeps
// `removeUserScanData` unit-testable with a fake instead of a live client.
export interface AdminClientLike {
  from(table: string): {
    delete(): {
      eq(column: string, value: string): Promise<{ error: { message: string } | null }>;
    };
  };
  storage: { from(bucket: string): StorageBucketLike };
}

// Removes a user's scanner artifacts from the project that owns the
// bill-scans bucket: every `bill-scans/<userId>/` Storage object plus the
// scanner telemetry rows in SCAN_TELEMETRY_TABLES. Best-effort by design —
// each step's failure is collected into `errors` rather than thrown, so one
// missing table or a storage hiccup never blocks the rest (and never blocks
// the caller's account deletion). Returns the storage count and any errors
// so the route can log them. Throws only if `userId` is empty.
export async function removeUserScanData(
  admin: AdminClientLike,
  userId: string
): Promise<{ storageObjectsRemoved: number; errors: string[] }> {
  if (!userId) throw new Error('removeUserScanData: userId is required');

  const errors: string[] = [];

  for (const table of SCAN_TELEMETRY_TABLES) {
    try {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error) errors.push(`${table}: ${error.message}`);
    } catch (e) {
      errors.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let storageObjectsRemoved = 0;
  try {
    const result = await removeUserStorageObjects(
      admin.storage.from(BILL_SCANS_BUCKET),
      userId
    );
    storageObjectsRemoved = result.removed;
  } catch (e) {
    errors.push(`storage: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { storageObjectsRemoved, errors };
}
