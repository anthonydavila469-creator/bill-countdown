import { createAdminClient } from '@/lib/supabase/admin';
import { sendReminderEmail } from '@/lib/send-reminder-email';
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings, type ReminderPreference } from '@/types';

type ReminderPreferenceRow = {
  user_id: string;
  notification_settings: Partial<NotificationSettings> | null;
};

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  due_date: string;
};

type SentReminderRow = {
  bill_id: string;
};

type SendReminderSummary = {
  sent: number;
  users: number;
  errors: string[];
};

const REMINDER_DAY_MAP: Record<ReminderPreference, number | null> = {
  disabled: null,
  '1day': 1,
  '3days': 3,
  '7days': 7,
};

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

export async function sendDueDateReminders(runDate = new Date()): Promise<SendReminderSummary> {
  const supabase = createAdminClient();
  const today = dateStringInUtc(runDate);
  const summary: SendReminderSummary = {
    sent: 0,
    users: 0,
    errors: [],
  };

  const { data: preferenceRows, error: preferenceError } = await supabase
    .from('user_preferences')
    .select('user_id, notification_settings');

  if (preferenceError) {
    throw new Error(`Failed to load reminder preferences: ${preferenceError.message}`);
  }

  const users = ((preferenceRows ?? []) as ReminderPreferenceRow[])
    .map((row) => ({
      user_id: row.user_id,
      remind_me: normalizeReminderPreference(row.notification_settings?.remind_me),
    }))
    .filter((row) => row.remind_me !== 'disabled');

  summary.users = users.length;

  for (const user of users) {
    const reminderDays = REMINDER_DAY_MAP[user.remind_me];

    if (reminderDays === null) {
      continue;
    }

    const targetDueDate = addDays(today, reminderDays);

    const [userResult, billsResult, sentResult] = await Promise.all([
      supabase.auth.admin.getUserById(user.user_id),
      supabase
        .from('bills')
        .select('id, user_id, name, amount, due_date')
        .eq('user_id', user.user_id)
        .eq('is_paid', false)
        .eq('due_date', targetDueDate),
      supabase
        .from('sent_reminders')
        .select('bill_id')
        .eq('user_id', user.user_id)
        .eq('reminder_date', today),
    ]);

    const userEmail = userResult.data.user?.email;

    if (!userEmail) {
      summary.errors.push(`Skipped user ${user.user_id}: no auth email`);
      continue;
    }

    if (billsResult.error) {
      summary.errors.push(`Failed fetching bills for ${user.user_id}: ${billsResult.error.message}`);
      continue;
    }

    if (sentResult.error) {
      summary.errors.push(`Failed fetching sent reminders for ${user.user_id}: ${sentResult.error.message}`);
      continue;
    }

    const alreadySent = new Set(
      ((sentResult.data ?? []) as SentReminderRow[]).map((row) => row.bill_id)
    );

    for (const bill of (billsResult.data ?? []) as BillRow[]) {
      if (alreadySent.has(bill.id)) {
        continue;
      }

      const reserveResult = await supabase
        .from('sent_reminders')
        .insert({
          user_id: user.user_id,
          bill_id: bill.id,
          reminder_date: today,
        });

      if (reserveResult.error) {
        if (reserveResult.error.code === '23505') {
          continue;
        }

        summary.errors.push(`Failed reserving reminder for bill ${bill.id}: ${reserveResult.error.message}`);
        continue;
      }

      const sendResult = await sendReminderEmail(
        userEmail,
        bill.name,
        bill.due_date,
        bill.amount,
        daysBetween(bill.due_date, today)
      );

      if (!sendResult.success) {
        await supabase
          .from('sent_reminders')
          .delete()
          .eq('user_id', user.user_id)
          .eq('bill_id', bill.id)
          .eq('reminder_date', today);

        summary.errors.push(`Failed sending reminder for bill ${bill.id}: ${sendResult.error ?? 'Unknown error'}`);
        continue;
      }

      summary.sent += 1;
    }
  }

  return summary;
}
