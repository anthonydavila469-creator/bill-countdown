/**
 * Auto-Sync Orchestration
 * Core logic for automatic daily Gmail sync with race condition protection
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchBillEmails,
  refreshAccessToken,
  extractEmailBody,
  extractEmailHtml,
  getHeader,
} from '@/lib/gmail/client';
import { processEmailBatch, ProcessEmailOptions } from '@/lib/bill-extraction';
import {
  isKnownBillerDomain,
  hasBillKeywords,
  isPromotionalEmail,
} from './known-billers';
import type { SyncResult } from '@/types';

/**
 * Pre-filter result for tracking statistics
 */
interface PreFilterResult {
  passed: ProcessEmailOptions['email'][];
  filteredCount: number;
}

/**
 * Gmail token data from database
 */
interface GmailTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  email: string;
}

/**
 * Acquire a PostgreSQL advisory lock for sync operations
 * Returns true if lock acquired, false if already held by another process
 */
export async function acquireSyncLock(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('acquire_sync_lock', {
    p_user_id: userId,
  });

  if (error) {
    console.error(`[AUTO-SYNC] Failed to acquire lock for ${userId}:`, error);
    return false;
  }

  return data === true;
}

/**
 * Release the PostgreSQL advisory lock for sync operations
 */
export async function releaseSyncLock(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.rpc('release_sync_lock', {
    p_user_id: userId,
  });

  if (error) {
    console.error(`[AUTO-SYNC] Failed to release lock for ${userId}:`, error);
  }
}

/**
 * Pre-filter emails before AI processing to reduce costs
 *
 * Filter pipeline:
 * 1. Skip Google Calendar notifications
 * 2. Pass if known biller domain
 * 3. Pass if subject has bill keywords
 * 4. Skip if promotional keywords detected
 * 5. Default: pass to AI (let AI decide edge cases)
 */
export function preFilterEmails(
  emails: ProcessEmailOptions['email'][]
): PreFilterResult {
  const passed: ProcessEmailOptions['email'][] = [];
  let filteredCount = 0;

  for (const email of emails) {
    const fromLower = email.from.toLowerCase();
    const subjectLower = email.subject.toLowerCase();

    // 1. Skip Google Calendar notifications
    if (
      fromLower.includes('calendar-notification@google.com') ||
      fromLower.includes('calendar@google.com') ||
      fromLower.includes('noreply@google.com/calendar')
    ) {
      filteredCount++;
      continue;
    }

    // 2. Pass if known biller domain
    if (isKnownBillerDomain(email.from)) {
      passed.push(email);
      continue;
    }

    // 3. Pass if subject has bill keywords
    if (hasBillKeywords(email.subject)) {
      passed.push(email);
      continue;
    }

    // 4. Skip if promotional keywords detected
    if (isPromotionalEmail(email.subject)) {
      filteredCount++;
      continue;
    }

    // 5. Default: pass to AI (let AI decide edge cases)
    // This ensures we don't miss legitimate bills from unknown senders
    passed.push(email);
  }

  return { passed, filteredCount };
}

/**
 * Create a sync log entry
 */
async function createSyncLog(
  supabase: SupabaseClient,
  userId: string,
  syncType: 'manual' | 'auto'
): Promise<string | null> {
  const { data, error } = await supabase
    .from('sync_logs')
    .insert({
      user_id: userId,
      sync_type: syncType,
      status: 'running',
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[AUTO-SYNC] Failed to create sync log:`, error);
    return null;
  }

  return data?.id || null;
}

/**
 * Update a sync log with results
 */
async function updateSyncLog(
  supabase: SupabaseClient,
  syncLogId: string,
  updates: {
    status: 'completed' | 'failed' | 'skipped';
    completed_at?: string;
    emails_fetched?: number;
    emails_filtered?: number;
    emails_processed?: number;
    bills_created?: number;
    bills_needs_review?: number;
    error_message?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('sync_logs')
    .update({
      ...updates,
      completed_at: updates.completed_at || new Date().toISOString(),
    })
    .eq('id', syncLogId);

  if (error) {
    console.error(`[AUTO-SYNC] Failed to update sync log:`, error);
  }
}

/**
 * Main auto-sync function for a single user
 * Handles token refresh, email fetching, pre-filtering, and processing
 */
export async function performAutoSync(
  userId: string,
  supabase: SupabaseClient,
  options: {
    syncType?: 'manual' | 'auto';
    maxResults?: number;
    daysBack?: number;
  } = {}
): Promise<SyncResult> {
  const { syncType = 'auto', maxResults = 100, daysBack = 2 } = options;

  // Create sync log
  const syncLogId = await createSyncLog(supabase, userId, syncType);

  try {
    // Get stored Gmail tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('access_token, refresh_token, expires_at, email')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      const errorMsg = 'Gmail not connected';
      if (syncLogId) {
        await updateSyncLog(supabase, syncLogId, {
          status: 'failed',
          error_message: errorMsg,
        });
      }
      return {
        success: false,
        syncLogId: syncLogId || undefined,
        emailsFetched: 0,
        emailsFiltered: 0,
        emailsProcessed: 0,
        billsCreated: 0,
        billsNeedsReview: 0,
        error: errorMsg,
      };
    }

    let accessToken = (tokenData as GmailTokenData).access_token;

    // Check if token is expired and refresh if needed
    const expiresAt = new Date((tokenData as GmailTokenData).expires_at).getTime();
    if (Date.now() >= expiresAt - 60000) {
      try {
        const newTokens = await refreshAccessToken(
          (tokenData as GmailTokenData).refresh_token
        );
        accessToken = newTokens.access_token;

        // Update stored token
        await supabase
          .from('gmail_tokens')
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(newTokens.expires_at).toISOString(),
          })
          .eq('user_id', userId);
      } catch {
        const errorMsg = 'Failed to refresh Gmail token';
        if (syncLogId) {
          await updateSyncLog(supabase, syncLogId, {
            status: 'failed',
            error_message: errorMsg,
          });
        }

        // Update auto_sync_error
        await supabase
          .from('gmail_tokens')
          .update({ auto_sync_error: errorMsg })
          .eq('user_id', userId);

        return {
          success: false,
          syncLogId: syncLogId || undefined,
          emailsFetched: 0,
          emailsFiltered: 0,
          emailsProcessed: 0,
          billsCreated: 0,
          billsNeedsReview: 0,
          error: errorMsg,
        };
      }
    }

    // Fetch bill-related emails from Gmail
    const messages = await fetchBillEmails(accessToken, maxResults, daysBack);
    console.log(`[AUTO-SYNC] Gmail returned ${messages.length} messages for user ${userId}`);

    // Transform messages to extraction format
    const emails: ProcessEmailOptions['email'][] = [];
    const seenIds = new Set<string>();

    for (const msg of messages) {
      if (seenIds.has(msg.id)) continue;
      seenIds.add(msg.id);

      const from = getHeader(msg, 'From');
      const subject = getHeader(msg, 'Subject');
      const body = extractEmailBody(msg);
      const htmlBody = extractEmailHtml(msg);

      emails.push({
        gmail_message_id: msg.id,
        subject,
        from,
        date: new Date(parseInt(msg.internalDate)).toISOString(),
        body_plain: body,
        body_html: htmlBody,
      });
    }

    // Pre-filter emails before AI processing
    const { passed: filteredEmails, filteredCount } = preFilterEmails(emails);
    console.log(
      `[AUTO-SYNC] Pre-filtered: ${filteredCount} filtered, ${filteredEmails.length} passed`
    );

    // Process emails in batch
    const result = await processEmailBatch(userId, filteredEmails);

    // Update sync log with success
    if (syncLogId) {
      await updateSyncLog(supabase, syncLogId, {
        status: 'completed',
        emails_fetched: messages.length,
        emails_filtered: filteredCount,
        emails_processed: result.processed,
        bills_created: result.autoAccepted,
        bills_needs_review: result.needsReview,
      });
    }

    // Update gmail_tokens with success
    await supabase
      .from('gmail_tokens')
      .update({
        last_auto_sync_at: new Date().toISOString(),
        auto_sync_error: null,
      })
      .eq('user_id', userId);

    return {
      success: true,
      syncLogId: syncLogId || undefined,
      emailsFetched: messages.length,
      emailsFiltered: filteredCount,
      emailsProcessed: result.processed,
      billsCreated: result.autoAccepted,
      billsNeedsReview: result.needsReview,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AUTO-SYNC] Error for user ${userId}:`, errorMsg);

    if (syncLogId) {
      await updateSyncLog(supabase, syncLogId, {
        status: 'failed',
        error_message: errorMsg,
      });
    }

    // Update auto_sync_error
    await supabase
      .from('gmail_tokens')
      .update({ auto_sync_error: errorMsg })
      .eq('user_id', userId);

    return {
      success: false,
      syncLogId: syncLogId || undefined,
      emailsFetched: 0,
      emailsFiltered: 0,
      emailsProcessed: 0,
      billsCreated: 0,
      billsNeedsReview: 0,
      error: errorMsg,
    };
  }
}
