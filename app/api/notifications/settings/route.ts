import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { NextResponse } from 'next/server';
import { DEFAULT_NOTIFICATION_SETTINGS, type Bill, type NotificationSettings, type ReminderPreference } from '@/types';
import { scheduleNotificationsForBill } from '@/lib/notifications/scheduler';
import { generateInAppReminders } from '@/lib/notifications/generate-reminders';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_REMIND_ME_VALUES = new Set<ReminderPreference>(['disabled', '1day', '3days', '7days']);

function normalizeNotificationSettings(raw: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  const reminderDays = Array.isArray(raw?.reminder_days)
    ? raw.reminder_days
    : [raw?.lead_days ?? DEFAULT_NOTIFICATION_SETTINGS.lead_days];

  const uniqueReminderDays = [...new Set(reminderDays)]
    .filter((day) => typeof day === 'number' && day >= 0 && day <= 30)
    .sort((a, b) => b - a);

  const derivedRemindMe: ReminderPreference = uniqueReminderDays.length === 0
    ? 'disabled'
    : uniqueReminderDays.length === 1 && uniqueReminderDays[0] === 1
      ? '1day'
      : uniqueReminderDays.length === 1 && uniqueReminderDays[0] === 3
        ? '3days'
        : uniqueReminderDays.length === 1 && uniqueReminderDays[0] === 7
          ? '7days'
          : uniqueReminderDays.includes(1)
            ? '1day'
            : uniqueReminderDays.includes(3)
              ? '3days'
              : uniqueReminderDays.includes(7)
                ? '7days'
                : DEFAULT_NOTIFICATION_SETTINGS.remind_me;

  const remindMe = Array.isArray(raw?.reminder_days)
    ? derivedRemindMe
    : VALID_REMIND_ME_VALUES.has(raw?.remind_me as ReminderPreference)
      ? (raw?.remind_me as ReminderPreference)
      : derivedRemindMe;

  const normalizedReminderDays = remindMe === 'disabled'
    ? []
    : uniqueReminderDays.length > 0
      ? uniqueReminderDays
      : [...DEFAULT_NOTIFICATION_SETTINGS.reminder_days];

  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...raw,
    remind_me: remindMe,
    reminder_days: normalizedReminderDays,
    lead_days: normalizedReminderDays.length > 0
      ? Math.min(...normalizedReminderDays)
      : DEFAULT_NOTIFICATION_SETTINGS.lead_days,
  };
}

// GET /api/notifications/settings - Get notification settings
export async function GET(request: Request) {
  try {
    const { user, method } = await getAuthenticatedUser(request);
    const supabase = method === 'bearer' ? createAdminClient() : await createClient();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('notification_settings')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notification settings' },
        { status: 500 }
      );
    }

    const settings = normalizeNotificationSettings(
      preferences?.notification_settings as Partial<NotificationSettings> | null | undefined
    );

    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/settings - Update notification settings
export async function PUT(request: Request) {
  try {
    console.log('[notifications/settings][PUT] request received');
    const { user, method } = await getAuthenticatedUser(request);
    const supabase = method === 'bearer' ? createAdminClient() : await createClient();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as Partial<NotificationSettings>;
    console.log('[notifications/settings][PUT] auth user:', user.id, 'body:', body);

    const { data: existing } = await supabase
      .from('user_preferences')
      .select('notification_settings')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentSettings = normalizeNotificationSettings(
      existing?.notification_settings as Partial<NotificationSettings> | null | undefined
    );
    const newSettings = normalizeNotificationSettings({
      ...currentSettings,
      ...body,
    });

    if (!VALID_REMIND_ME_VALUES.has(newSettings.remind_me)) {
      return NextResponse.json(
        { error: 'Invalid remind_me value' },
        { status: 400 }
      );
    }

    if (typeof newSettings.lead_days !== 'number' || newSettings.lead_days < 0 || newSettings.lead_days > 30) {
      return NextResponse.json(
        { error: 'Invalid lead_days value' },
        { status: 400 }
      );
    }

    if (!Array.isArray(newSettings.reminder_days) || newSettings.reminder_days.some((d: number) => typeof d !== 'number' || d < 0 || d > 30)) {
      return NextResponse.json(
        { error: 'Invalid reminder_days value' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    let preferences: { notification_settings?: Partial<NotificationSettings> | null } | null = null;

    const { data: updatedPreferences, error: updateError } = await adminSupabase
      .from('user_preferences')
      .update({ notification_settings: newSettings })
      .eq('user_id', user.id)
      .select('notification_settings')
      .maybeSingle();

    if (updateError) {
      console.error('Error updating notification settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      );
    }

    if (updatedPreferences) {
      preferences = updatedPreferences;
    } else {
      const { data: insertedPreferences, error: insertError } = await adminSupabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          color_theme: 'amethyst',
          dashboard_layout: {},
          notification_settings: newSettings,
        })
        .select('notification_settings')
        .single();

      console.log('[notifications/settings][PUT] insert fallback result:', { insertedPreferences, insertError });

      if (insertError) {
        console.error('Error inserting notification settings:', insertError);
        return NextResponse.json(
          { error: 'Failed to update notification settings' },
          { status: 500 }
        );
      }

      preferences = insertedPreferences;
    }

    console.log('[notifications/settings][PUT] save result:', { preferences });

    const responseSettings = normalizeNotificationSettings(
      (preferences?.notification_settings as Partial<NotificationSettings> | null | undefined) ?? newSettings
    );

    try {
      const { data: unpaidBills, error: billsError } = await adminSupabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_paid', false);

      if (billsError) {
        console.error('[notifications/settings][PUT] failed to fetch unpaid bills for resync:', billsError);
      } else if (unpaidBills && unpaidBills.length > 0) {
        for (const bill of unpaidBills as Bill[]) {
          try {
            const scheduleResult = await scheduleNotificationsForBill(bill, responseSettings);
            if (scheduleResult.skipped.length > 0) {
              console.log('[notifications/settings][PUT] schedule sync notes for bill', bill.id, scheduleResult.skipped);
            }
          } catch (scheduleError) {
            console.error('[notifications/settings][PUT] schedule sync failed for bill', bill.id, scheduleError);
          }
        }

        try {
          const inAppResult = await generateInAppReminders(adminSupabase, unpaidBills as Bill[], user.id, responseSettings);
          console.log('[notifications/settings][PUT] in-app reminder sync:', inAppResult);
        } catch (inAppError) {
          console.error('[notifications/settings][PUT] in-app reminder sync failed:', inAppError);
        }
      }
    } catch (resyncError) {
      console.error('[notifications/settings][PUT] post-save resync failed:', resyncError);
    }

    console.log('[notifications/settings][PUT] response payload:', responseSettings);

    return NextResponse.json(responseSettings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
