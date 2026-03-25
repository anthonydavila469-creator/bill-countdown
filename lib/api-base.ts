import { Capacitor } from '@capacitor/core';

/**
 * Returns the base URL for API calls.
 * 
 * When running in the native Capacitor app (bundled locally),
 * the web files load from capacitor://localhost, so API calls
 * need to go to the remote server.
 * 
 * On the web, relative paths work fine.
 */
export function getApiBase(): string {
  if (Capacitor.isNativePlatform()) {
    return 'https://www.duezo.app';
  }
  return '';
}

/**
 * Build a full API URL.
 * Usage: apiUrl('/api/bills') → 'https://www.duezo.app/api/bills' (native)
 *                              → '/api/bills' (web)
 */
export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}
