import { NextResponse } from 'next/server';
import { apnsSender, type ApnsPayload } from '@/lib/apns-sender';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type Bill,
  type NotificationSettings,
  type ReminderPreference,
} from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ReminderPreferenceRow = {
  user_id: string;
  notification_settings: Partial<NotificationSettings> | null;
};

type BillRow = Pick<Bill, 'id' | 'user_id' | 'name' | 'amount' | 'due_date' | 'emoji' | 'payment_url'>;

type DeviceTokenRow = {
  id: string;
  device_token: string;
};

type SentPushReminderRow = {
  bill_id: string;
};

const REMINDER_DAY_MAP: Record<ReminderPreference, number | null> = {
  disabled: null,
  '1day': 1,
  '3days': 3,
  '7days': 7,
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const cronSecretHeader = request.headers.get('x-cron-secret');
  const authHeader = request.headers.get('authorization');

  return Boolean(secret) && (cronSecretHeader === secret || authHeader === `Bearer ${secret}`);
}

function normalizeReminderPreference(value: unknown): ReminderPreference {
  if (value === 'disabled' || value === '1day' || value === '3days' || value === '7days') {
    return value;
  }

  return DEFAULT_NOTIFICATION_SETTINGS.remind_me;
}

function dateStringInUtc(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(targetDate: string, baseDate: string): number {
  const target = new Date(`${targetDate}T00:00:00.000Z`).getTime();
  const base = new Date(`${baseDate}T00:00:00.000Z`).getTime();
  return Math.round((target - base) / 86400000);
}

function buildPushPayload(bill: BillRow, daysUntilDue: number): ApnsPayload {
  const dueText =
    daysUntilDue === 0 ? 'today' :
    daysUntilDue === 1 ? 'tomorrow' :
    `in ${daysUntilDue} days`;

  const body = bill.amount !== null ? `$${bill.amount.toFixed(2)} due ${dueText}` : `Due ${dueText}`;

  return {
    aps: {
      alert: {
        title: `${bill.emoji ?? '💳'} ${bill.name}`,
        body,
      },
      sound: 'default',
    },
    billId: bill.id,
    url: bill.payment_url ?? `/dashboard?bill=${bill.id}`,
    deeplink: `duezo://bill/${bill.id}`,
  };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const today = dateStringInUtc();
    const summary = {
      sent: 0,
      users: 0,
      errors: [] as string[],
    };

    const { data: preferenceRows, error: preferenceError } = await supabase
      .from('user_preferences')
      .select('user_id, notification_settings');

    if (preferenceError) {
      console.error('[send-push-reminders] Failed to load preferences:', preferenceError);
      return NextResponse.json({ sent: 0, users: 0, errors: [preferenceError.message] }, { status: 500 });
    }

    const users = ((preferenceRows ?? []) as ReminderPreferenceRow[])
      .map((row) => ({
        user_id: row.user_id,
        remind_me: normalizeReminderPreference(row.notification_settings?.remind_me),
        push_enabled: row.notification_settings?.push_enabled ?? DEFAULT_NOTIFICATION_SETTINGS.push_enabled,
      }))
      .filter((row) => row.push_enabled && row.remind_me !== 'disabled');

    summary.users = users.length;

    for (const user of users) {
      const reminderDays = REMINDER_DAY_MAP[user.remind_me];

      if (reminderDays === null) {
        continue;
      }

      const targetDueDate = addDays(today, reminderDays);

      const [billsResult, sentResult, tokensResult] = await Promise.all([
        supabase
          .from('bills')
          .select('id, user_id, name, amount, due_date, emoji, payment_url')
          .eq('user_id', user.user_id)
          .eq('is_paid', false)
          .eq('due_date', targetDueDate),
        supabase
          .from('sent_push_reminders')
          .select('bill_id')
          .eq('user_id', user.user_id)
          .eq('reminder_date', today),
        supabase
          .from('apns_tokens')
          .select('id, device_token')
          .eq('user_id', user.user_id),
      ]);

      if (billsResult.error) {
        summary.errors.push(`Failed fetching bills for ${user.user_id}: ${billsResult.error.message}`);
        continue;
      }

      if (sentResult.error) {
        summary.errors.push(`Failed fetching sent reminders for ${user.user_id}: ${sentResult.error.message}`);
        continue;
      }

      if (tokensResult.error) {
        summary.errors.push(`Failed fetching APNs tokens for ${user.user_id}: ${tokensResult.error.message}`);
        continue;
      }

      const tokens = (tokensResult.data ?? []) as DeviceTokenRow[];
      if (tokens.length === 0) {
        continue;
      }

      const alreadySent = new Set(
        ((sentResult.data ?? []) as SentPushReminderRow[]).map((row) => row.bill_id)
      );

      for (const bill of (billsResult.data ?? []) as BillRow[]) {
        if (alreadySent.has(bill.id)) {
          continue;
        }

        const reserveResult = await supabase
          .from('sent_push_reminders')
          .insert({
            user_id: user.user_id,
            bill_id: bill.id,
            reminder_date: today,
          });

        if (reserveResult.error) {
          if (reserveResult.error.code === '23505') {
            continue;
          }

          summary.errors.push(`Failed reserving push reminder for bill ${bill.id}: ${reserveResult.error.message}`);
          continue;
        }

        const payload = buildPushPayload(bill, daysBetween(bill.due_date, today));
        let sentForBill = 0;
        const invalidTokenIds: string[] = [];

        for (const token of tokens) {
          const result = await apnsSender.sendPush(token.device_token, payload);

          if (result.success) {
            sentForBill += 1;
            continue;
          }

          if (result.reason === 'Unregistered' || result.reason === 'BadDeviceToken') {
            invalidTokenIds.push(token.id);
          }

          summary.errors.push(
            `Failed sending push for bill ${bill.id} to token ${token.id}: ${result.reason ?? 'Unknown error'}`
          );
        }

        if (invalidTokenIds.length > 0) {
          const deleteResult = await supabase
            .from('apns_tokens')
            .delete()
            .in('id', invalidTokenIds);

          if (deleteResult.error) {
            summary.errors.push(`Failed deleting invalid APNs tokens for ${user.user_id}: ${deleteResult.error.message}`);
          }
        }

        if (sentForBill === 0) {
          const rollbackResult = await supabase
            .from('sent_push_reminders')
            .delete()
            .eq('user_id', user.user_id)
            .eq('bill_id', bill.id)
            .eq('reminder_date', today);

          if (rollbackResult.error) {
            summary.errors.push(`Failed rolling back push reminder for bill ${bill.id}: ${rollbackResult.error.message}`);
          }

          continue;
        }

        summary.sent += sentForBill;
      }
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[send-push-reminders] Cron error:', error);
    return NextResponse.json(
      { sent: 0, users: 0, errors: [error instanceof Error ? error.message : 'Internal server error'] },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Send APNs push reminders for bills matching each user remind_me preference.',
    schedule: '15 8 * * *',
  });
}
