import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { DEFAULT_NOTIFICATION_SETTINGS, type NotificationSettings } from '@/types';

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
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notification settings' },
        { status: 500 }
      );
    }

    const raw = preferences?.notification_settings ?? {};
    // Migrate old schemas that are missing newer fields
    const settings: NotificationSettings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...raw,
      // Ensure reminder_days always exists (migrate from lead_days)
      reminder_days: raw.reminder_days ?? [raw.lead_days ?? DEFAULT_NOTIFICATION_SETTINGS.lead_days],
    };
    return NextResponse.json(settings);
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
      .single();

    const currentSettings = existing?.notification_settings ?? DEFAULT_NOTIFICATION_SETTINGS;
    const newSettings: NotificationSettings = {
      ...currentSettings,
      ...body,
    };

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
      // Keep lead_days in sync with the smallest reminder_days value for backward compat
      if (newSettings.reminder_days.length > 0) {
        newSettings.lead_days = Math.min(...newSettings.reminder_days);
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

    const responseSettings = preferences?.notification_settings ?? newSettings;
    console.log('[notifications/settings][PUT] response payload:', responseSettings);

    return NextResponse.json(responseSettings);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
