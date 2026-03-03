import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Handle OAuth sign-in for both web and native Capacitor.
 *
 * On web: standard redirect flow.
 * On native (iPad/iPhone): opens SFSafariViewController via @capacitor/browser
 * so Google/Apple OAuth works (they block embedded WKWebView).
 * After the user completes OAuth in the browser, the callback sets session cookies
 * on the server. When the user returns to the app, we check for an active session.
 */
export async function signInWithOAuthNative(
  supabase: SupabaseClient,
  provider: 'google' | 'apple',
): Promise<{ error?: string }> {
  const isNative = Capacitor.isNativePlatform();
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: isNative,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (isNative && data?.url) {
    // Open in SFSafariViewController — Google/Apple allow this (not embedded WKWebView)
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
  }

  return {};
}

/**
 * Listen for the app returning to foreground and check for an authenticated session.
 * Used on login/signup pages in native Capacitor to detect when OAuth completes.
 */
export function listenForAuthReturn(
  supabase: SupabaseClient,
  onAuthenticated: () => void,
): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  const checkSession = async () => {
    if (document.visibilityState !== 'visible') return;

    // Small delay to let cookies sync after returning from SFSafariViewController
    await new Promise((r) => setTimeout(r, 500));

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Close the in-app browser if still open
      try { await Browser.close(); } catch { /* may already be closed */ }
      onAuthenticated();
    }
  };

  // Also listen for Capacitor Browser closed event
  const browserListener = Browser.addListener('browserFinished', async () => {
    await new Promise((r) => setTimeout(r, 500));
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      onAuthenticated();
    }
  });

  document.addEventListener('visibilitychange', checkSession);

  return () => {
    document.removeEventListener('visibilitychange', checkSession);
    browserListener.then(h => h.remove()).catch(() => {});
  };
}
