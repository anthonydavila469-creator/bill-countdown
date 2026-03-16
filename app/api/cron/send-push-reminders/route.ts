import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPush } from '@/lib/apns-sender';
import { DEFAULT_NOTIFICATION_SETTINGS, type Bill, type NotificationSettings } from '@/types';

type UserPreferencesRow = {
  user_id: string;
  notification_settings: Partial<NotificationSettings> | null;
};

type ApnsTokenRow = {
  user_id: string;
  device_token: string;
};

function normalizeSettings(raw: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  const reminderDays = Array.isArray(raw?.reminder_days)
    ? raw.reminder_days
    : [raw?.lead_days ?? DEFAULT_NOTIFICATION_SETTINGS.lead_days];

  const normalizedReminderDays = [...new Set(reminderDays)]
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 30)
    .sort((a, b) => b - a);

  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...raw,
    reminder_days: normalizedReminderDays.length > 0
      ? normalizedReminderDays
      : DEFAULT_NOTIFICATION_SETTINGS.reminder_days,
    lead_days: normalizedReminderDays.length > 0
      ? Math.min(...normalizedReminderDays)
      : DEFAULT_NOTIFICATION_SETTINGS.lead_days,
  };
}

function formatDateInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(dateString: string, days: number) {
  const baseDate = new Date(`${dateString}T00:00:00Z`);
  baseDate.setUTCDate(baseDate.getUTCDate() + days);
  return baseDate.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function buildReminderPayload(bill: Bill, daysUntilDue: number) {
  const dueText =
    daysUntilDue === 0 ? 'today' :
    daysUntilDue === 1 ? 'tomorrow' :
    `in ${daysUntilDue} days`;

  const amountText = typeof bill.amount === 'number' ? `$${bill.amount.toFixed(2)} ` : '';

  return {
    aps: {
      alert: {
        title: `${bill.emoji ?? '💳'} ${bill.name}`,
        body: `${amountText}due ${dueText}`.trim(),
      },
      sound: 'default',
      badge: 1,
      category: 'BILL_REMINDER',
      'thread-id': 'bill-reminders',
    },
    billId: bill.id,
    amount: bill.amount,
    daysUntilDue,
    url: bill.payment_url || `/dashboard?bill=${bill.id}`,
  } as const;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const now = new Date();

    const { data: tokenRows, error: tokenError } = await admin
      .from('apns_tokens')
      .select('user_id, device_token');

    if (tokenError) {
      console.error('Failed to fetch APNs tokens:', tokenError);
      return NextResponse.json({ error: 'Failed to fetch APNs tokens' }, { status: 500 });
    }

    const tokensByUser = new Map<string, string[]>();
    for (const row of (tokenRows ?? []) as ApnsTokenRow[]) {
      const tokens = tokensByUser.get(row.user_id) ?? [];
      tokens.push(row.device_token);
      tokensByUser.set(row.user_id, tokens);
    }

    const userIds = [...tokensByUser.keys()];
    if (userIds.length === 0) {
      return NextResponse.json({ processedUsers: 0, sent: 0, skipped: 0, failed: 0 });
    }

    const { data: preferenceRows, error: preferencesError } = await admin
      .from('user_preferences')
      .select('user_id, notification_settings')
      .in('user_id', userIds);

    if (preferencesError) {
      console.error('Failed to fetch notification settings:', preferencesError);
      return NextResponse.json({ error: 'Failed to fetch notification settings' }, { status: 500 });
    }

    const preferencesByUser = new Map<string, NotificationSettings>();
    for (const row of (preferenceRows ?? []) as UserPreferencesRow[]) {
      preferencesByUser.set(row.user_id, normalizeSettings(row.notification_settings));
    }

    const results = {
      processedUsers: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    for (const userId of userIds) {
      const settings = preferencesByUser.get(userId) ?? DEFAULT_NOTIFICATION_SETTINGS;
      const deviceTokens = tokensByUser.get(userId) ?? [];

      if (!settings.push_enabled || deviceTokens.length === 0) {
        results.skipped++;
        continue;
      }

      results.processedUsers++;
      const reminderDate = formatDateInTimezone(now, settings.timezone);
      const maxReminderDays = Math.max(...settings.reminder_days);

      const { data: bills, error: billsError } = await admin
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .eq('is_paid', false)
        .gte('due_date', reminderDate)
        .lte('due_date', addDays(reminderDate, maxReminderDays))
        .order('due_date', { ascending: true });

      if (billsError) {
        console.error(`Failed to fetch bills for user ${userId}:`, billsError);
        results.failed++;
        continue;
      }

      const candidateBills = (bills ?? []) as Bill[];
      if (candidateBills.length === 0) {
        continue;
      }

      const { data: sentRows, error: sentError } = await admin
        .from('sent_push_reminders')
        .select('bill_id')
        .eq('user_id', userId)
        .eq('reminder_date', reminderDate)
        .in('bill_id', candidateBills.map((bill) => bill.id));

      if (sentError) {
        console.error(`Failed to fetch sent reminders for user ${userId}:`, sentError);
        results.failed++;
        continue;
      }

      const alreadySentBillIds = new Set((sentRows ?? []).map((row: { bill_id: string }) => row.bill_id));

      for (const bill of candidateBills) {
        const daysUntilDue = daysBetween(reminderDate, bill.due_date);

        if (!settings.reminder_days.includes(daysUntilDue)) {
          continue;
        }

        if (alreadySentBillIds.has(bill.id)) {
          results.skipped++;
          continue;
        }

        let successCount = 0;
        let failedCount = 0;
        const invalidTokens: string[] = [];

        for (const deviceToken of deviceTokens) {
          const response = await sendPush(deviceToken, buildReminderPayload(bill, daysUntilDue));
          if (response.ok) {
            successCount++;
            continue;
          }

          failedCount++;
          if (response.reason === 'Unregistered' || response.reason === 'BadDeviceToken') {
            invalidTokens.push(deviceToken);
          }
          console.error(`APNs send failed for user ${userId}, bill ${bill.id}:`, response);
        }

        if (invalidTokens.length > 0) {
          await admin
            .from('apns_tokens')
            .delete()
            .eq('user_id', userId)
            .in('device_token', invalidTokens);
        }

        if (successCount > 0) {
          const { error: insertError } = await admin
            .from('sent_push_reminders')
            .insert({
              user_id: userId,
              bill_id: bill.id,
              reminder_date: reminderDate,
              sent_at: new Date().toISOString(),
            });

          if (insertError && insertError.code !== '23505') {
            console.error(`Failed to record sent push reminder for bill ${bill.id}:`, insertError);
          }

          results.sent += successCount;
        }

        results.failed += failedCount;
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Unexpected push cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
