import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { acquireSyncLock, releaseSyncLock, performAutoSync } from '@/lib/sync/auto-sync';
import { sendNewBillsDetectedPush } from '@/lib/notifications/sync-notifications';
import type { NotificationSettings, SyncResult } from '@/types';

const DEFAULT_NOTIFICATION_SETTINGS_WITH_SYNC = {
  email_enabled: true,
  push_enabled: false,
  lead_days: 3,
  quiet_start: null,
  quiet_end: null,
  timezone: 'America/New_York',
  auto_sync_enabled: true,
};

interface UserToSync {
  user_id: string;
  last_auto_sync_at: string | null;
  auto_sync_error: string | null;
}

/**
 * POST /api/cron/auto-sync-bills
 * Daily cron job to automatically sync Gmail for bill emails
 * Runs at 14:00 UTC (9am EST / 6am PST)
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Fetch users with Gmail connected who need syncing
    // Criteria:
    // 1. Have auto_sync_enabled AND never synced, OR
    // 2. Have auto_sync_enabled AND last sync > 20 hours ago, OR
    // 3. Have auto_sync_error AND last attempt > 1 hour ago (retry failed)
    const { data: gmailTokens, error: tokensError } = await supabase
      .from('gmail_tokens')
      .select('user_id, last_auto_sync_at, auto_sync_error')
      .order('last_auto_sync_at', { ascending: true, nullsFirst: true });

    if (tokensError) {
      console.error('[AUTO-SYNC] Failed to fetch gmail tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!gmailTokens || gmailTokens.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No users with Gmail connected',
      });
    }

    // Fetch notification settings for all users to check auto_sync_enabled
    const userIds = gmailTokens.map((t) => t.user_id);
    const { data: userPrefs } = await supabase
      .from('user_preferences')
      .select('user_id, notification_settings')
      .in('user_id', userIds);

    // Build map of user settings
    const settingsMap = new Map<string, NotificationSettings>();
    for (const pref of userPrefs || []) {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS_WITH_SYNC,
        ...(pref.notification_settings || {}),
      } as NotificationSettings;
      settingsMap.set(pref.user_id, settings);
    }

    // Filter users who need syncing
    const usersToSync: UserToSync[] = [];

    for (const token of gmailTokens as UserToSync[]) {
      const settings = settingsMap.get(token.user_id) || DEFAULT_NOTIFICATION_SETTINGS_WITH_SYNC;

      // Skip if auto_sync_enabled is explicitly false
      if (settings.auto_sync_enabled === false) {
        continue;
      }

      // Case 1: Never synced
      if (!token.last_auto_sync_at) {
        usersToSync.push(token);
        continue;
      }

      const lastSyncTime = new Date(token.last_auto_sync_at);

      // Case 2: Last sync > 20 hours ago
      if (lastSyncTime < twentyHoursAgo) {
        usersToSync.push(token);
        continue;
      }

      // Case 3: Has error and last attempt > 1 hour ago
      if (token.auto_sync_error && lastSyncTime < oneHourAgo) {
        usersToSync.push(token);
        continue;
      }
    }

    console.log(
      `[AUTO-SYNC] Found ${usersToSync.length} users to sync out of ${gmailTokens.length} total`
    );

    if (usersToSync.length === 0) {
      return NextResponse.json({
        processed: 0,
        message: 'No users need syncing at this time',
      });
    }

    // Process users in batches of 5 (parallel)
    const BATCH_SIZE = 5;
    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      totalBillsCreated: 0,
      totalNeedsReview: 0,
    };

    for (let i = 0; i < usersToSync.length; i += BATCH_SIZE) {
      const batch = usersToSync.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (user) => {
          return processSingleUser(supabase, user.user_id, settingsMap);
        })
      );

      for (const result of batchResults) {
        results.processed++;
        if (result.skipped) {
          results.skipped++;
        } else if (result.success) {
          results.success++;
          results.totalBillsCreated += result.billsCreated;
          results.totalNeedsReview += result.needsReview;
        } else {
          results.failed++;
        }
      }
    }

    console.log(`[AUTO-SYNC] Completed: ${JSON.stringify(results)}`);

    return NextResponse.json(results);
  } catch (error) {
    console.error('[AUTO-SYNC] Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process a single user's sync with locking and notifications
 */
async function processSingleUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  settingsMap: Map<string, NotificationSettings>
): Promise<{
  success: boolean;
  skipped: boolean;
  billsCreated: number;
  needsReview: number;
  error?: string;
}> {
  let lockAcquired = false;

  try {
    // Try to acquire lock
    lockAcquired = await acquireSyncLock(supabase, userId);
    if (!lockAcquired) {
      console.log(`[AUTO-SYNC] Skipping user ${userId} - lock held`);
      return { success: false, skipped: true, billsCreated: 0, needsReview: 0 };
    }

    // Perform the sync
    const result: SyncResult = await performAutoSync(userId, supabase, {
      syncType: 'auto',
      maxResults: 100,
      daysBack: 2,
    });

    // Release lock
    await releaseSyncLock(supabase, userId);
    lockAcquired = false;

    // Send push notification if bills were found
    if (result.success && (result.billsCreated > 0 || result.billsNeedsReview > 0)) {
      const settings = settingsMap.get(userId);
      if (settings?.push_enabled) {
        await sendNewBillsDetectedPush(
          supabase,
          userId,
          result.billsCreated,
          result.billsNeedsReview
        );
      }
    }

    return {
      success: result.success,
      skipped: false,
      billsCreated: result.billsCreated,
      needsReview: result.billsNeedsReview,
      error: result.error,
    };
  } catch (error) {
    // Release lock if acquired
    if (lockAcquired) {
      await releaseSyncLock(supabase, userId);
    }

    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AUTO-SYNC] Error for user ${userId}:`, errorMsg);

    return {
      success: false,
      skipped: false,
      billsCreated: 0,
      needsReview: 0,
      error: errorMsg,
    };
  }
}

/**
 * GET handler for testing (returns sync stats)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get recent sync logs
  const { data: recentLogs, error } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'auto')
    .order('started_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }

  // Get aggregate stats
  const stats = {
    total: recentLogs?.length || 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    totalBillsCreated: 0,
    totalNeedsReview: 0,
  };

  for (const log of recentLogs || []) {
    if (log.status === 'completed') {
      stats.completed++;
      stats.totalBillsCreated += log.bills_created || 0;
      stats.totalNeedsReview += log.bills_needs_review || 0;
    } else if (log.status === 'failed') {
      stats.failed++;
    } else if (log.status === 'skipped') {
      stats.skipped++;
    }
  }

  return NextResponse.json({
    stats,
    recentLogs: recentLogs?.slice(0, 10),
  });
}
