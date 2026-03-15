import type { SupabaseClient } from '@supabase/supabase-js';
import { getProvider, type EmailProviderName, type ProviderEmail, type ProviderTokens } from '@/lib/email/providers';

export interface EmailConnectionRecord {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  email: string;
  email_provider: EmailProviderName;
  last_sync_at?: string | null;
  created_at?: string | null;
  last_auto_sync_at?: string | null;
  auto_sync_error?: string | null;
}

export async function getEmailConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<EmailConnectionRecord | null> {
  const { data, error } = await supabase
    .from('gmail_tokens')
    .select('access_token, refresh_token, expires_at, email, email_provider, last_sync_at, created_at, last_auto_sync_at, auto_sync_error')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    ...data,
    email_provider: (data.email_provider || 'gmail') as EmailProviderName,
  };
}

export async function persistEmailConnection(
  supabase: SupabaseClient,
  userId: string,
  providerName: EmailProviderName,
  tokens: ProviderTokens
): Promise<void> {
  const expiresAtIso = new Date(tokens.expires_at).toISOString();

  const { error: tokenError } = await supabase
    .from('gmail_tokens')
    .upsert(
      {
        user_id: userId,
        email: tokens.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAtIso,
        email_provider: providerName,
      },
      { onConflict: 'user_id' }
    );

  if (tokenError) {
    throw tokenError;
  }

  const { error: prefsError } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        email_provider: providerName,
        email_connected: true,
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expires_at: expiresAtIso,
      },
      { onConflict: 'user_id' }
    );

  if (prefsError) {
    throw prefsError;
  }
}

export async function clearEmailConnection(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('gmail_tokens')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    throw deleteError;
  }

  const { error: prefsError } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        email_connected: false,
        gmail_access_token: null,
        gmail_refresh_token: null,
        gmail_token_expires_at: null,
      },
      { onConflict: 'user_id' }
    );

  if (prefsError) {
    throw prefsError;
  }
}

export async function ensureValidAccessToken(
  supabase: SupabaseClient,
  userId: string,
  connection: EmailConnectionRecord
): Promise<EmailConnectionRecord> {
  const expiresAt = new Date(connection.expires_at).getTime();
  if (Date.now() < expiresAt - 60_000) {
    return connection;
  }

  const provider = getProvider(connection.email_provider);
  const refreshed = await provider.refreshToken(connection.refresh_token);
  const refreshedExpiresAt = new Date(refreshed.expires_at).toISOString();

  const { error } = await supabase
    .from('gmail_tokens')
    .update({
      access_token: refreshed.access_token,
      expires_at: refreshedExpiresAt,
      email_provider: connection.email_provider,
    })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  const { error: prefsError } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        email_provider: connection.email_provider,
        email_connected: true,
        gmail_access_token: refreshed.access_token,
        gmail_token_expires_at: refreshedExpiresAt,
      },
      { onConflict: 'user_id' }
    );

  if (prefsError) {
    throw prefsError;
  }

  return {
    ...connection,
    access_token: refreshed.access_token,
    expires_at: refreshedExpiresAt,
  };
}

export async function fetchProviderEmails(
  supabase: SupabaseClient,
  userId: string,
  options: { maxResults?: number; daysBack?: number } = {}
): Promise<{ connection: EmailConnectionRecord; emails: ProviderEmail[] }> {
  const connection = await getEmailConnection(supabase, userId);
  if (!connection) {
    throw new Error('EMAIL_NOT_CONNECTED');
  }

  const validConnection = await ensureValidAccessToken(supabase, userId, connection);
  const provider = getProvider(validConnection.email_provider);
  const emails = await provider.fetchEmails(validConnection.access_token, {
    ...options,
    emailAddress: validConnection.email,
  });

  return {
    connection: validConnection,
    emails,
  };
}
