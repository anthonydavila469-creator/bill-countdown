import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { SupabaseClient } from '@supabase/supabase-js';

// Module-level store for pending transfer key (native OAuth only)
let pendingTransferKey: string | null = null;

// App URL scheme for deep link callback
const APP_SCHEME = 'app.duezo';

/**
 * Handle OAuth sign-in for both web and native Capacitor.
 *
 * On web: standard redirect flow.
 * On native (iPad/iPhone): opens SFSafariViewController via @capacitor/browser.
 * After OAuth completes, the server redirects to the app's URL scheme,
 * which triggers the appUrlOpen listener to retrieve tokens.
 */
export async function signInWithOAuthNative(
  supabase: SupabaseClient,
  provider: 'google' | 'apple',
): Promise<{ error?: string }> {
  const isNative = Capacitor.isNativePlatform();

  // For native: generate a transfer key to bridge session from SFVC to WKWebView
  if (isNative) {
    pendingTransferKey = crypto.randomUUID();
  }

  const redirectTo = isNative
    ? `${window.location.origin}/auth/callback?transfer_key=${pendingTransferKey}`
    : `${window.location.origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: isNative,
    },
  });

  if (error) {
    pendingTransferKey = null;
    return { error: error.message };
  }

  if (isNative && data?.url) {
    // Open in SFSafariViewController — Google/Apple allow this (not embedded WKWebView).
    // Use fullScreen to ensure visibility on both iPhone and iPad compatibility mode.
    await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
  }

  return {};
}

/**
 * Listen for the app returning via deep link (appUrlOpen) after OAuth completes.
 * This replaces the unreliable browserPageLoaded/browserFinished events
 * which don't fire consistently on iPad compatibility mode.
 *
 * The server-side callback redirects to app.duezo://auth-callback?transfer_key=...
 * which triggers this listener to fetch tokens and set the session.
 */
export function listenForAuthReturn(
  supabase: SupabaseClient,
  onAuthenticated: () => void,
  onDismissed?: () => void,
): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let resolved = false;

  const tryResolveSession = async (transferKey: string) => {
    if (resolved) return;

    // Fetch tokens via transfer API
    try {
      const res = await fetch(`/api/auth/transfer?key=${transferKey}`);
      if (res.ok) {
        const { access_token, refresh_token } = await res.json();
        await supabase.auth.setSession({ access_token, refresh_token });
        resolved = true;
        pendingTransferKey = null;
        try { await Browser.close(); } catch { /* may already be closed */ }
        onAuthenticated();
        return;
      }
    } catch { /* transfer not ready, fall through */ }

    // Retry once after a short delay (race condition: redirect may arrive before DB write)
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const res = await fetch(`/api/auth/transfer?key=${transferKey}`);
      if (res.ok) {
        const { access_token, refresh_token } = await res.json();
        await supabase.auth.setSession({ access_token, refresh_token });
        resolved = true;
        pendingTransferKey = null;
        try { await Browser.close(); } catch { /* may already be closed */ }
        onAuthenticated();
        return;
      }
    } catch { /* give up */ }
  };

  // Primary: listen for deep link callback via @capacitor/app
  // The server redirects to app.duezo://auth-callback?transfer_key=xxx
  const appUrlListener = App.addListener('appUrlOpen', async (event) => {
    if (resolved) return;

    const url = new URL(event.url);
    if (url.pathname === '/auth-callback' || url.host === 'auth-callback') {
      const transferKey = url.searchParams.get('transfer_key');
      if (transferKey) {
        await tryResolveSession(transferKey);
      }
    }
  });

  // Fallback: listen for browser dismissed without completing auth
  const browserListener = Browser.addListener('browserFinished', async () => {
    // Give a moment for appUrlOpen to fire first (it should arrive before browserFinished)
    await new Promise((r) => setTimeout(r, 2000));
    if (!resolved && onDismissed) {
      pendingTransferKey = null;
      onDismissed();
    }
  });

  // Fallback: visibility change (app returning to foreground)
  const checkSession = async () => {
    if (document.visibilityState !== 'visible' || resolved) return;
    await new Promise((r) => setTimeout(r, 1500));

    // Check if we have a session (might have been set by appUrlOpen already)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      resolved = true;
      pendingTransferKey = null;
      try { await Browser.close(); } catch { /* may already be closed */ }
      onAuthenticated();
    }
  };

  document.addEventListener('visibilitychange', checkSession);

  return () => {
    document.removeEventListener('visibilitychange', checkSession);
    appUrlListener.then(h => h.remove()).catch(() => {});
    browserListener.then(h => h.remove()).catch(() => {});
  };
}
