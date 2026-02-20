import { createAdminClient } from '@/lib/supabase/admin';
import { sendBillReminderEmail } from '@/lib/notifications/email-sender';
import { sendBillReminderPushToAll } from '@/lib/notifications/push-sender';
import { sendBillReminderAPNs } from '@/lib/notifications/apns-sender';
import { NextResponse } from 'next/server';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/types';
import type { Bill, NotificationSettings, PushSubscription, BillNotification } from '@/types';

// POST /api/cron/send-bill-reminders - Process and send pending notifications
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const now = new Date();

    // Fetch pending queue items where scheduled_for <= now
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('bill_notifications_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(100); // Process in batches

    if (fetchError) {
      console.error('Failed to fetch pending notifications:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending notifications' });
    }

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    // Group notifications by user for efficiency
    const notificationsByUser = new Map<string, BillNotification[]>();
    for (const notification of pendingNotifications) {
      const userNotifications = notificationsByUser.get(notification.user_id) || [];
      userNotifications.push(notification as BillNotification);
      notificationsByUser.set(notification.user_id, userNotifications);
    }

    // Process each user's notifications
    for (const [userId, userNotifications] of notificationsByUser) {
      // Fetch user data, settings, and push subscriptions
      const [userResult, prefsResult, subsResult, apnsResult] = await Promise.all([
        supabase.auth.admin.getUserById(userId),
        supabase
          .from('user_preferences')
          .select('notification_settings')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('apns_tokens')
          .select('token')
          .eq('user_id', userId),
      ]);

      const userEmail = userResult.data?.user?.email;
      const settings: NotificationSettings = prefsResult.data?.notification_settings ?? DEFAULT_NOTIFICATION_SETTINGS;
      const pushSubscriptions: PushSubscription[] = (subsResult.data as PushSubscription[]) ?? [];
      const apnsTokens: string[] = (apnsResult.data ?? []).map((r: { token: string }) => r.token);

      // Process each notification for this user
      for (const notification of userNotifications) {
        results.processed++;

        // Fetch the bill
        const { data: bill, error: billError } = await supabase
          .from('bills')
          .select('*')
          .eq('id', notification.bill_id)
          .single();

        if (billError || !bill) {
          // Bill was deleted, mark as skipped
          await updateNotificationStatus(supabase, notification.id, 'skipped', 'Bill not found');
          results.skipped++;
          continue;
        }

        // Skip if bill is paid
        if ((bill as Bill).is_paid) {
          await updateNotificationStatus(supabase, notification.id, 'skipped', 'Bill already paid');
          results.skipped++;
          continue;
        }

        // Calculate days until due
        const dueDate = new Date((bill as Bill).due_date + 'T00:00:00');
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Send based on channel
        let sendResult: { success: boolean; error?: string } = { success: false };

        if (notification.channel === 'email') {
          if (!userEmail) {
            await updateNotificationStatus(supabase, notification.id, 'skipped', 'No email address');
            results.skipped++;
            continue;
          }

          if (!settings.email_enabled) {
            await updateNotificationStatus(supabase, notification.id, 'skipped', 'Email notifications disabled');
            results.skipped++;
            continue;
          }

          sendResult = await sendBillReminderEmail(userEmail, bill as Bill, daysUntilDue);
        } else if (notification.channel === 'push') {
          const hasVapid = pushSubscriptions.length > 0;
          const hasApns = apnsTokens.length > 0;

          if (!hasVapid && !hasApns) {
            await updateNotificationStatus(supabase, notification.id, 'skipped', 'No push subscriptions');
            results.skipped++;
            continue;
          }

          if (!settings.push_enabled) {
            await updateNotificationStatus(supabase, notification.id, 'skipped', 'Push notifications disabled');
            results.skipped++;
            continue;
          }

          let totalSent = 0;
          let totalFailed = 0;

          // Send via Web Push (VAPID) for browser subscribers
          if (hasVapid) {
            const pushResult = await sendBillReminderPushToAll(
              pushSubscriptions,
              bill as Bill,
              daysUntilDue
            );

            totalSent += pushResult.sent;
            totalFailed += pushResult.failed;

            // Clean up expired VAPID subscriptions
            if (pushResult.expiredEndpoints.length > 0) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .in('endpoint', pushResult.expiredEndpoints);
            }
          }

          // Send via APNs for iOS devices
          if (hasApns) {
            const apnsResult = await sendBillReminderAPNs(
              apnsTokens,
              bill as Bill,
              daysUntilDue
            );

            totalSent += apnsResult.sent;
            totalFailed += apnsResult.failed;

            // Clean up expired APNs tokens
            if (apnsResult.expiredTokens.length > 0) {
              await supabase
                .from('apns_tokens')
                .delete()
                .eq('user_id', userId)
                .in('token', apnsResult.expiredTokens);
            }
          }

          sendResult = {
            success: totalSent > 0,
            error: totalFailed > 0 ? `${totalFailed} failed` : undefined,
          };
        }

        // Update notification status
        if (sendResult.success) {
          await updateNotificationStatus(supabase, notification.id, 'sent');
          results.sent++;
        } else {
          await updateNotificationStatus(supabase, notification.id, 'failed', sendResult.error);
          results.failed++;
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateNotificationStatus(
  supabase: ReturnType<typeof createAdminClient>,
  notificationId: string,
  status: 'sent' | 'failed' | 'skipped',
  errorMessage?: string
) {
  await supabase
    .from('bill_notifications_queue')
    .update({
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error_message: errorMessage ?? null,
    })
    .eq('id', notificationId);
}

// GET handler for testing (returns current queue stats)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bill_notifications_queue')
    .select('status')
    .then(result => {
      if (result.error) return result;

      const stats = {
        pending: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
      };

      for (const row of result.data ?? []) {
        const status = row.status as keyof typeof stats;
        if (status in stats) {
          stats[status]++;
        }
      }

      return { data: stats, error: null };
    });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  return NextResponse.json(data);
}
