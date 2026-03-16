import { createAdminClient } from '@/lib/supabase/admin';
import { DEFAULT_NOTIFICATION_SETTINGS, type Bill, type NotificationSettings } from '@/types';
import { sendBillReminderEmail } from './email-sender';
import { daysBetweenDateStrings, formatDateInTimeZone, normalizeTimeZone } from './reminder-utils';

type ReminderPreferenceRow = {
  user_id: string;
  notification_settings: Partial<NotificationSettings> | null;
};

type SentReminderRow = {
  bill_id: string;
};

type SendReminderSummary = {
  usersProcessed: number;
  billsMatched: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function normalizeReminderSettings(raw: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  const reminderDays = Array.isArray(raw?.reminder_days)
    ? raw.reminder_days
    : [raw?.lead_days ?? DEFAULT_NOTIFICATION_SETTINGS.lead_days];

  const normalizedReminderDays = [...new Set(reminderDays)]
    .filter((value) => typeof value === 'number' && value >= 0 && value <= 30)
    .sort((a, b) => b - a);

  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...raw,
    reminder_days: normalizedReminderDays.length > 0
      ? normalizedReminderDays
      : [...DEFAULT_NOTIFICATION_SETTINGS.reminder_days],
    lead_days: normalizedReminderDays.length > 0
      ? Math.min(...normalizedReminderDays)
      : DEFAULT_NOTIFICATION_SETTINGS.lead_days,
    timezone: normalizeTimeZone(raw?.timezone ?? DEFAULT_NOTIFICATION_SETTINGS.timezone),
    remind_me: raw?.remind_me ?? DEFAULT_NOTIFICATION_SETTINGS.remind_me,
  };
}

export async function sendDueDateReminders(runDate = new Date()): Promise<SendReminderSummary> {
  const supabase = createAdminClient();
  const summary: SendReminderSummary = {
    usersProcessed: 0,
    billsMatched: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const { data: preferenceRows, error: preferenceError } = await supabase
    .from('user_preferences')
    .select('user_id, notification_settings')
    .filter('notification_settings->>remind_me', 'eq', 'true');

  if (preferenceError) {
    throw new Error(`Failed to load reminder preferences: ${preferenceError.message}`);
  }

  const users = (preferenceRows ?? []) as ReminderPreferenceRow[];

  for (const row of users) {
    const settings = normalizeReminderSettings(row.notification_settings);

    if (!settings.remind_me || settings.reminder_days.length === 0) {
      continue;
    }

    summary.usersProcessed++;

    const today = formatDateInTimeZone(runDate, settings.timezone);
    const maxReminderDay = Math.max(...settings.reminder_days);
    const maxDueDate = new Date(`${today}T00:00:00Z`);
    maxDueDate.setUTCDate(maxDueDate.getUTCDate() + maxReminderDay);
    const maxDueDateString = maxDueDate.toISOString().split('T')[0];

    const [userResult, billsResult] = await Promise.all([
      supabase.auth.admin.getUserById(row.user_id),
      supabase
        .from('bills')
        .select('*')
        .eq('user_id', row.user_id)
        .eq('is_paid', false)
        .gte('due_date', today)
        .lte('due_date', maxDueDateString),
    ]);

    const userEmail = userResult.data.user?.email;

    if (!userEmail) {
      summary.skipped++;
      summary.errors.push(`Skipped user ${row.user_id}: no auth email`);
      continue;
    }

    if (billsResult.error) {
      summary.failed++;
      summary.errors.push(`Failed fetching bills for ${row.user_id}: ${billsResult.error.message}`);
      continue;
    }

    const matchingBills = ((billsResult.data ?? []) as Bill[]).filter((bill) =>
      settings.reminder_days.includes(daysBetweenDateStrings(bill.due_date, today))
    );

    summary.billsMatched += matchingBills.length;

    if (matchingBills.length === 0) {
      continue;
    }

    const reminderDate = today;
    const { data: existingRows, error: sentError } = await supabase
      .from('sent_reminders')
      .select('bill_id')
      .eq('user_id', row.user_id)
      .eq('reminder_date', reminderDate);

    if (sentError) {
      summary.failed++;
      summary.errors.push(`Failed fetching sent reminders for ${row.user_id}: ${sentError.message}`);
      continue;
    }

    const alreadySentBillIds = new Set(
      ((existingRows ?? []) as SentReminderRow[]).map((entry) => entry.bill_id)
    );

    for (const bill of matchingBills) {
      if (alreadySentBillIds.has(bill.id)) {
        summary.skipped++;
        continue;
      }

      const insertResult = await supabase
        .from('sent_reminders')
        .insert({
          user_id: row.user_id,
          bill_id: bill.id,
          reminder_date: reminderDate,
        });

      if (insertResult.error) {
        if (insertResult.error.code === '23505') {
          summary.skipped++;
          continue;
        }

        summary.failed++;
        summary.errors.push(`Failed reserving reminder for bill ${bill.id}: ${insertResult.error.message}`);
        continue;
      }

      const daysUntilDue = daysBetweenDateStrings(bill.due_date, today);
      const sendResult = await sendBillReminderEmail(userEmail, bill, daysUntilDue, {
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://duezo.app',
        timeZone: settings.timezone,
      });

      if (!sendResult.success) {
        await supabase
          .from('sent_reminders')
          .delete()
          .eq('user_id', row.user_id)
          .eq('bill_id', bill.id)
          .eq('reminder_date', reminderDate);

        summary.failed++;
        summary.errors.push(`Failed sending reminder for bill ${bill.id}: ${sendResult.error ?? 'Unknown error'}`);
        continue;
      }

      summary.sent++;
    }
  }

  return summary;
}
