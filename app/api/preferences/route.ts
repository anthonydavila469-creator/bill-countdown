import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  DEFAULT_COLOR_THEME,
  DEFAULT_DASHBOARD_LAYOUT,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/types';

// GET /api/preferences - Get user preferences (or defaults)
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // If user is not pro, they cannot update customization settings
    // (but we'll still let them save defaults / non-customization fields)
    const updateData: Record<string, unknown> = {
      user_id: user.id,
    };

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

    // Gmail syncs counter can be incremented
    if (body.gmail_syncs_used !== undefined) {
      updateData.gmail_syncs_used = body.gmail_syncs_used;
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
