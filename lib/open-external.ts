import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Open an external URL.
 * On native: uses @capacitor/browser (SFSafariViewController) with popover style.
 *   This is appropriate for payment URLs, help pages, etc. — NOT for OAuth.
 *   The user can tap "Done" to dismiss and return to the app.
 * On web: standard window.open.
 */
export async function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url,
      presentationStyle: 'popover',
      toolbarColor: '#0F0A1E',
    });
  } else {
    window.open(url, '_blank');
  }
}
