import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeApnsToken } from '@/lib/apns/apns-sender';
import { DEFAULT_COLOR_THEME, DEFAULT_DASHBOARD_LAYOUT, DEFAULT_NOTIFICATION_SETTINGS } from '@/types';

export type ApnsTokenMetadata = {
  id: string;
  device_name: string | null;
  is_active: boolean;
  created_at: string;
  last_verified_at: string | null;
};

export type ActiveApnsToken = ApnsTokenMetadata & {
  token: string;
};

type UpsertApnsTokenResult = {
  id: string;
  created_at: string;
};

async function ensureUserPreferencesRow(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        color_theme: DEFAULT_COLOR_THEME,
        dashboard_layout: DEFAULT_DASHBOARD_LAYOUT,
        notification_settings: DEFAULT_NOTIFICATION_SETTINGS,
      },
      {
        onConflict: 'user_id',
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertApnsToken(
  supabase: SupabaseClient,
  userId: string,
  token: string,
  deviceName?: string
): Promise<UpsertApnsTokenResult> {
  const normalizedToken = normalizeApnsToken(token);
  const now = new Date().toISOString();

  await ensureUserPreferencesRow(supabase, userId);

  const { data, error } = await supabase
    .from('apns_tokens')
    .upsert(
      {
        user_id: userId,
        token: normalizedToken,
        device_name: deviceName?.trim() || null,
        is_active: true,
        last_verified_at: now,
      },
      {
        onConflict: 'token',
      }
    )
    .select('id, created_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save APNs token');
  }

  return data as UpsertApnsTokenResult;
}

export async function listApnsTokensForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<ApnsTokenMetadata[]> {
  const { data, error } = await supabase
    .from('apns_tokens')
    .select('id, device_name, is_active, created_at, last_verified_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ApnsTokenMetadata[];
}

export async function listActiveApnsTokensForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveApnsToken[]> {
  const { data, error } = await supabase
    .from('apns_tokens')
    .select('id, token, device_name, is_active, created_at, last_verified_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ActiveApnsToken[];
}

export async function deactivateApnsToken(
  supabase: SupabaseClient,
  userId: string,
  tokenId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('apns_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('id', tokenId)
    .eq('is_active', true)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function deactivateApnsTokensByIds(
  supabase: SupabaseClient,
  userId: string,
  tokenIds: string[]
): Promise<void> {
  if (tokenIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('apns_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .in('id', tokenIds);

  if (error) {
    throw new Error(error.message);
  }
}

export async function markApnsTokensVerifiedByIds(
  supabase: SupabaseClient,
  userId: string,
  tokenIds: string[]
): Promise<void> {
  if (tokenIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('apns_tokens')
    .update({ last_verified_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', tokenIds);

  if (error) {
    throw new Error(error.message);
  }
}
