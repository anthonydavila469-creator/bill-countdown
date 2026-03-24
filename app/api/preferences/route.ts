import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import {
  DEFAULT_COLOR_THEME,
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/types';

// Use admin client for Bearer-auth requests (Capacitor) to bypass RLS,
// since the server Supabase client only has cookie-based auth context.
async function getDbClient(method: 'cookie' | 'bearer' | null) {
  return method === 'bearer' ? createAdminClient() : await createClient();
}

// GET /api/preferences - Get user preferences (or defaults)
export async function GET(request: Request) {
  try {
    const { user, method } = await getAuthenticatedUser(request);
    const supabase = await getDbClient(method);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (new user without preferences)
      console.error('Error fetching preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return preferences or defaults
    if (!preferences) {
      return NextResponse.json({
        is_pro: false,
        color_theme: DEFAULT_COLOR_THEME,
        dashboard_layout: DEFAULT_DASHBOARD_LAYOUT,
        notification_settings: DEFAULT_NOTIFICATION_SETTINGS,
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/preferences - Update user preferences
export async function PUT(request: Request) {
  try {
    const { user, method } = await getAuthenticatedUser(request);
    const supabase = await getDbClient(method);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Check if user has existing preferences
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('id, is_pro')
      .eq('user_id', user.id)
      .single();

    // If no existing row, include safe defaults so the upsert insert
    // doesn't violate the chk_color_theme constraint (DB default is 'default'
    // which is NOT in the allowed list — must be 'amethyst' or similar).
    const updateData: Record<string, unknown> = {
      user_id: user.id,
    };

    if (!existing) {
      updateData.color_theme = DEFAULT_COLOR_THEME;
      updateData.dashboard_layout = DEFAULT_DASHBOARD_LAYOUT;
      updateData.notification_settings = DEFAULT_NOTIFICATION_SETTINGS;
    }

    // Color theme can be updated by anyone (themes are free)
    if (body.color_theme !== undefined) {
      updateData.color_theme = body.color_theme;
    }

    // Dashboard layout can be updated by anyone for now
    if (body.dashboard_layout !== undefined) {
      updateData.dashboard_layout = body.dashboard_layout;
    }

    // Notification settings can be updated by anyone
    if (body.notification_settings !== undefined) {
      updateData.notification_settings = body.notification_settings;
    }

    // Upsert preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .upsert(updateData, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
