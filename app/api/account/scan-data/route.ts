import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRateLimited } from '@/lib/rate-limit';
import { removeUserScanData } from '@/lib/account/delete-account-data';

// DELETE /api/account/scan-data — account-deletion companion cleanup
// (Privacy P1-1 / P1-7).
//
// The iOS app deletes accounts via the duezo `delete_account` RPC, which
// removes the auth user + app rows on the duezo project. But raw bill-scan
// images and scanner telemetry live in THIS backend's project (the one that
// owns the `bill-scans` bucket), which that RPC can't reach. iOS calls this
// route with its still-valid session token just before the RPC so those
// artifacts are cleaned up too.
//
// Auth: the caller's bearer token is the only credential — the same trust
// level as the scan upload that created the data (a valid session already
// has full access to its own rows). No password is required and NO auth user
// is deleted here; the duezo RPC owns auth-user removal. This route only
// deletes the authenticated user's own scan storage + telemetry, so it can
// never touch another account's data.
export async function DELETE(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Rate limit: a few per minute is plenty (the delete flow calls this
    // once, with retries). Keeps a leaked token from sweeping repeatedly.
    if (isRateLimited(`delete-scan-data:${userId}`, 5, 60_000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    const admin = createAdminClient();
    // Adapt the real client to the helper's minimal shape: the async wrapper
    // normalizes the Postgrest builder into the plain `Promise<{ error }>`
    // the helper (and its unit-test fake) expect.
    const { storageObjectsRemoved, errors } = await removeUserScanData(
      {
        from: (table) => ({
          delete: () => ({
            eq: async (column, value) => {
              const { error } = await admin.from(table).delete().eq(column, value);
              return { error: error ? { message: error.message } : null };
            },
          }),
        }),
        storage: { from: (bucket) => admin.storage.from(bucket) },
      },
      userId
    );

    // Best-effort: surface per-step failures in logs but still return 200 so
    // the iOS delete flow continues to the authoritative RPC. A residual row
    // also cascades on the eventual auth.users delete where wired.
    for (const message of errors) {
      console.error('scan-data cleanup:', message);
    }

    return NextResponse.json({
      success: true,
      storage_objects_removed: storageObjectsRemoved,
    });
  } catch (error) {
    console.error('Unexpected error deleting scan data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
