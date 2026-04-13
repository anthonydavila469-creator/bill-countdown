/**
 * Generate in-app notification records for upcoming bills.
 * Uses each user's saved reminder_days / lead_days settings.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bill, NotificationSettings } from '@/types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/types';

function normalizeReminderDays(settings: Partial<NotificationSettings> | null | undefined): number[] {
  const reminderDays = Array.isArray(settings?.reminder_days) && settings.reminder_days.length > 0
    ? settings.reminder_days
    : typeof settings?.lead_days === 'number'
      ? [settings.lead_days]
      : [...DEFAULT_NOTIFICATION_SETTINGS.reminder_days];

  return [...new Set(reminderDays)]
    .filter((day) => typeof day === 'number' && day >= 0 && day <= 30)
    .sort((a, b) => b - a);
}

function buildMessage(bill: Bill, daysUntil: number): string {
  const amount = bill.amount ? ` $${bill.amount.toFixed(2)}` : '';
  if (daysUntil === 0) return `${bill.emoji} ${bill.name}${amount} is due today!`;
  if (daysUntil === 1) return `${bill.emoji} ${bill.name}${amount} is due tomorrow`;
  return `${bill.emoji} ${bill.name}${amount} due in ${daysUntil} days`;
}

export async function generateInAppReminders(
  supabase: SupabaseClient,
  bills: Bill[],
  userId: string,
  settings?: Partial<NotificationSettings> | null
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  const now = new Date();

  const effectiveSettings = settings ?? await (async () => {
    const { data } = await supabase
      .from('user_preferences')
      .select('notification_settings')
      .eq('user_id', userId)
      .maybeSingle();

    return (data?.notification_settings as Partial<NotificationSettings> | null | undefined) ?? DEFAULT_NOTIFICATION_SETTINGS;
  })();

  const reminderDays = normalizeReminderDays(effectiveSettings);

  for (const bill of bills) {
    if (bill.is_paid) continue;

    await supabase
      .from('bill_notifications_queue')
      .delete()
      .eq('user_id', userId)
      .eq('bill_id', bill.id)
      .eq('channel', 'in_app')
      .gte('scheduled_for', now.toISOString());

    if (reminderDays.length === 0) {
      skipped++;
      continue;
    }

    const dueDate = new Date(bill.due_date + 'T00:00:00');

    for (const leadDays of reminderDays) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - leadDays);

      if (reminderDate < now) continue;

      const scheduledDateStr = reminderDate.toISOString().split('T')[0];
      const scheduledFor = new Date(scheduledDateStr + 'T09:00:00Z');
      const message = buildMessage(bill, leadDays);

      const { error } = await supabase
        .from('bill_notifications_queue')
        .upsert(
          {
            user_id: userId,
            bill_id: bill.id,
            scheduled_for: scheduledFor.toISOString(),
            scheduled_date: scheduledDateStr,
            channel: 'in_app',
            status: 'sent',
            sent_at: now.toISOString(),
            message,
          },
          { onConflict: 'user_id,bill_id,channel,scheduled_date' }
        );

      if (error) {
        if (error.code === '23505') {
          skipped++;
        } else {
          console.error('Failed to create in-app notification:', error);
          skipped++;
        }
      } else {
        created++;
      }
    }
  }

  return { created, skipped };
}
