/**
 * Generate in-app notification records for upcoming bills.
 * Creates reminders at 7, 3, and 1 day(s) before due date.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bill } from '@/types';

const REMINDER_DAYS = [7, 3, 1];

function buildMessage(bill: Bill, daysUntil: number): string {
  const amount = bill.amount ? ` $${bill.amount.toFixed(2)}` : '';
  if (daysUntil === 0) return `${bill.emoji} ${bill.name}${amount} is due today!`;
  if (daysUntil === 1) return `${bill.emoji} ${bill.name}${amount} is due tomorrow`;
  return `${bill.emoji} ${bill.name}${amount} due in ${daysUntil} days`;
}

export async function generateInAppReminders(
  supabase: SupabaseClient,
  bills: Bill[],
  userId: string
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  const now = new Date();

  for (const bill of bills) {
    if (bill.is_paid) continue;

    const dueDate = new Date(bill.due_date + 'T00:00:00');

    for (const leadDays of REMINDER_DAYS) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - leadDays);

      // Skip if reminder date is in the past
      if (reminderDate < now) continue;

      const scheduledDateStr = reminderDate.toISOString().split('T')[0];
      // Schedule at 9 AM UTC for the reminder date
      const scheduledFor = new Date(scheduledDateStr + 'T09:00:00Z');

      const daysUntil = leadDays;
      const message = buildMessage(bill, daysUntil);

      // Use upsert with unique constraint to avoid duplicates
      const { error } = await supabase
        .from('bill_notifications_queue')
        .upsert(
          {
            user_id: userId,
            bill_id: bill.id,
            scheduled_for: scheduledFor.toISOString(),
            scheduled_date: scheduledDateStr,
            channel: 'in_app',
            status: 'sent', // in-app notifications are immediately "sent"
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
