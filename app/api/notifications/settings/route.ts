import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeNotificationSettings(raw: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  const reminderDays = Array.isArray(raw?.reminder_days)
    ? raw.reminder_days
    : [raw?.lead_days ?? DEFAULT_NOTIFICATION_SETTINGS.lead_days];

  const uniqueReminderDays = [...new Set(reminderDays)]
    .filter((day) => typeof day === 'number' && day >= 0 && day <= 30)
    .sort((a, b) => b - a);

  const normalizedReminderDays =
    uniqueReminderDays.length > 0
      ? uniqueReminderDays
      : [...DEFAULT_NOTIFICATION_SETTINGS.reminder_days];

  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...raw,
    reminder_days: normalizedReminderDays,
    lead_days: Math.min(...normalizedReminderDays),
  };
}

// GET /api/notifications/settings - Get notification settings
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as Partial<NotificationSettings>;
    console.log('[notifications/settings][PUT] auth user:', user.id, 'body:', body);

    // Get existing settings and merge
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

    // Validate settings
    if (typeof newSettings.lead_days !== 'number' || newSettings.lead_days < 0 || newSettings.lead_days > 30) {
      return NextResponse.json(
        { error: 'Invalid lead_days value' },
        { status: 400 }
      );
    }

    // Validate reminder_days if provided
    if (newSettings.reminder_days !== undefined) {
      if (!Array.isArray(newSettings.reminder_days) || newSettings.reminder_days.some((d: number) => typeof d !== 'number' || d < 0 || d > 30)) {
        return NextResponse.json(
          { error: 'Invalid reminder_days value' },
          { status: 400 }
        );
      }
    }

    // Use the service role client after auth succeeds so writes are not sensitive to
    // RLS/upsert edge cases, while still scoping the update to the authenticated user.
    const adminSupabase = createAdminClient();

    // Upsert preferences with new notification settings
    const { data: preferences, error } = await adminSupabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        notification_settings: newSettings,
      }, {
        onConflict: 'user_id',
      })
      .select('notification_settings')
      .single();

    console.log('[notifications/settings][PUT] upsert result:', { preferences, error });

    if (error) {
      console.error('Error updating notification settings:', error);
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      );
    }

    const responseSettings = normalizeNotificationSettings(
      (preferences?.notification_settings as Partial<NotificationSettings> | null | undefined) ?? newSettings
    );
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
