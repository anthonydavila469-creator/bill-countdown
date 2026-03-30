import { Capacitor } from '@capacitor/core';

const API_BASE = 'https://www.duezo.app';

/**
 * Returns the base URL for API calls.
 * Native: https://www.duezo.app (remote server)
 * Web: '' (relative paths)
 */
export function getApiBase(): string {
  if (Capacitor.isNativePlatform()) {
    return API_BASE;
  }
  return '';
}

/**
 * Build a full API URL.
 */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}

/**
 * Enhanced fetch for API calls that includes auth token on native.
 * On native, cookies don't transfer cross-origin, so we send the
 * Supabase access token as a Bearer header.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  
  if (Capacitor.isNativePlatform()) {
    // Get the current session token from Supabase client
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${session.access_token}`);
        headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
        options = { ...options, headers };
      }
    } catch (err) {
      console.warn('[apiFetch] Failed to attach auth token:', err);
    }
  }

  return fetch(url, options);
}
