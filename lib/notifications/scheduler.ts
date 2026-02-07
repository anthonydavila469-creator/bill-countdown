import { createAdminClient } from '@/lib/supabase/admin';
import type { Bill, NotificationSettings, NotificationChannel } from '@/types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/types';

interface ScheduleResult {
  scheduled: number;
  skipped: string[];
}

/**
 * Schedule notifications for a bill based on user preferences
 */
export async function scheduleNotificationsForBill(
  bill: Bill,
  settings: NotificationSettings
): Promise<ScheduleResult> {
  const supabase = createAdminClient();
  const result: ScheduleResult = { scheduled: 0, skipped: [] };

  // Skip if bill is already paid
  if (bill.is_paid) {
    result.skipped.push('Bill is already paid');
    return result;
  }

  // Skip if no notifications are enabled
  if (!settings.email_enabled && !settings.push_enabled) {
    result.skipped.push('No notification channels enabled');
    return result;
  }

  // Calculate scheduled time: due_date - lead_days at 9AM in user's timezone
  const dueDate = new Date(bill.due_date + 'T00:00:00');
  const scheduledDate = new Date(dueDate);
  scheduledDate.setDate(scheduledDate.getDate() - settings.lead_days);

  // Set to 9AM in user's timezone
  const scheduledFor = getScheduledTimeInTimezone(scheduledDate, settings.timezone, 9, 0);

  // Skip if scheduled time is in the past
  if (scheduledFor <= new Date()) {
    result.skipped.push('Scheduled time is in the past');
    return result;
  }

  // Skip if scheduled time is after due date
  if (scheduledFor >= dueDate) {
    result.skipped.push('Scheduled time is after due date');
    return result;
  }

  // Delete any existing pending notifications for this bill
  await supabase
    .from('bill_notifications_queue')
    .delete()
    .eq('bill_id', bill.id)
    .eq('status', 'pending');

  // Insert queue items for enabled channels
  const channels: NotificationChannel[] = [];
  if (settings.email_enabled) channels.push('email');
  if (settings.push_enabled) channels.push('push');

  // Get the date portion for the unique constraint
  const scheduledDateStr = scheduledFor.toISOString().split('T')[0];

  for (const channel of channels) {
    const { error } = await supabase
      .from('bill_notifications_queue')
      .insert({
        user_id: bill.user_id,
        bill_id: bill.id,
        scheduled_for: scheduledFor.toISOString(),
        scheduled_date: scheduledDateStr,
        channel,
        status: 'pending',
      });

    if (error) {
      // Unique constraint violation means notification already exists for this day
      if (error.code === '23505') {
        result.skipped.push(`${channel} notification already scheduled for this day`);
      } else {
        console.error(`Failed to schedule ${channel} notification:`, error);
        result.skipped.push(`Failed to schedule ${channel}: ${error.message}`);
      }
    } else {
      result.scheduled++;
    }
  }

  return result;
}

/**
 * Cancel all pending notifications for a bill
 */
export async function cancelNotificationsForBill(billId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('bill_notifications_queue')
    .delete()
    .eq('bill_id', billId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    console.error('Failed to cancel notifications:', error);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Get a Date object representing the specified time in a given timezone
 */
function getScheduledTimeInTimezone(
  date: Date,
  timezone: string,
  hours: number,
  minutes: number
): Date {
  // Create a date string in the format: YYYY-MM-DDTHH:MM:SS
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  // Use Intl.DateTimeFormat to find the UTC offset for the timezone at this date
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Create a date at midnight UTC, then adjust
    const utcDate = new Date(dateStr + 'Z');

    // Get the offset by comparing the timezone time with UTC
    const parts = formatter.formatToParts(utcDate);
    const tzParts: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== 'literal') {
        tzParts[part.type] = part.value;
      }
    }

    // Construct date in target timezone
    const tzDateStr = `${tzParts.year}-${tzParts.month}-${tzParts.day}T${tzParts.hour}:${tzParts.minute}:${tzParts.second}`;

    // Calculate the offset
    const tzTime = new Date(tzDateStr + 'Z').getTime();
    const utcTime = utcDate.getTime();
    const offsetMs = utcTime - tzTime;

    // Return the UTC time that represents the desired local time
    return new Date(new Date(dateStr + 'Z').getTime() + offsetMs);
  } catch {
    // Fallback to treating as UTC if timezone is invalid
    console.error(`Invalid timezone: ${timezone}, falling back to UTC`);
    return new Date(dateStr + 'Z');
  }
}


/**
 * Schedule notifications for a bill, fetching user settings automatically
 * This is the main entry point for API routes
 */
export async function scheduleNotificationsForBillWithSettings(
  bill: Bill
): Promise<ScheduleResult> {
  const supabase = createAdminClient();

  // Fetch user's notification settings
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('notification_settings')
    .eq('user_id', bill.user_id)
    .single();

  const settings: NotificationSettings = preferences?.notification_settings ?? DEFAULT_NOTIFICATION_SETTINGS;

  return scheduleNotificationsForBill(bill, settings);
}
