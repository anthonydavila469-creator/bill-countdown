import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { SupabaseClient } from '@supabase/supabase-js';

// Module-level store for pending transfer key (native OAuth only)
let pendingTransferKey: string | null = null;

/**
 * Handle OAuth sign-in for both web and native Capacitor.
 *
 * On web: standard redirect flow.
 * On native (iPad/iPhone): opens SFSafariViewController via @capacitor/browser.
 * After OAuth completes in the browser, tokens are stored server-side via a
 * transfer key. When the user returns to the app, we retrieve the tokens and
 * set the session in the WKWebView.
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
    // Use fullScreen to ensure visibility/browser events fire correctly on iPad.
    await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
  }

  return {};
}

/**
 * Listen for the app returning to foreground and retrieve the auth session.
 * Used on login/signup pages in native Capacitor to detect when OAuth completes.
 *
 * After SFSafariViewController closes, we fetch the stored session tokens via
 * the transfer API and set them in the WKWebView's Supabase client.
 */
export function listenForAuthReturn(
  supabase: SupabaseClient,
  onAuthenticated: () => void,
  onDismissed?: () => void,
): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let resolved = false;

  const tryResolveSession = async () => {
    if (resolved) return;

    // Try transfer-based auth (primary method — bridges SFVC ↔ WKWebView)
    if (pendingTransferKey) {
      try {
        const res = await fetch(`/api/auth/transfer?key=${pendingTransferKey}`);
        if (res.ok) {
          const { access_token, refresh_token } = await res.json();
          await supabase.auth.setSession({ access_token, refresh_token });
          resolved = true;
          pendingTransferKey = null;
          try { await Browser.close(); } catch { /* may already be closed */ }
          onAuthenticated();
          return;
        }
      } catch { /* transfer not ready yet, fall through */ }
    }

    // Fallback: check if session exists (e.g. email/password login, or session already set)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      resolved = true;
      pendingTransferKey = null;
      try { await Browser.close(); } catch { /* may already be closed */ }
      onAuthenticated();
    }
  };

  const checkSession = async () => {
    if (document.visibilityState !== 'visible') return;
    // Delay to let the auth callback complete on the server
    await new Promise((r) => setTimeout(r, 1000));
    await tryResolveSession();
  };

  // Listen for browser closed event (SFSafariViewController dismissed)
  // Listen for pages loading inside the SFSafariViewController.
  // When the auth callback page loads ("Returning to Duezo..."), the server has
  // already stored the tokens — we can fetch them and close the browser immediately.
  // This fires for every page load inside the SFVC (including the Apple auth page
  // itself), but tryResolveSession is a no-op until tokens exist.
  const pageLoadedListener = Browser.addListener('browserPageLoaded', async () => {
    if (resolved || !pendingTransferKey) return;
    // Wait briefly for the server to finish writing the token row
    await new Promise((r) => setTimeout(r, 800));
    await tryResolveSession();
  });

  const browserListener = Browser.addListener('browserFinished', async () => {
    await new Promise((r) => setTimeout(r, 500));
    await tryResolveSession();
    // If we didn't resolve (auth failed/cancelled), reset the loading state
    if (!resolved && onDismissed) {
      pendingTransferKey = null;
      onDismissed();
    }
  });

  // Listen for app returning to foreground
  document.addEventListener('visibilitychange', checkSession);

  // Also listen for focus and pageshow events — iPad compatibility mode
  // may not fire visibilitychange reliably when SFSafariViewController closes.
  const focusHandler = () => {
    if (!resolved && pendingTransferKey) {
      setTimeout(() => tryResolveSession(), 500);
    }
  };
  window.addEventListener('focus', focusHandler);
  window.addEventListener('pageshow', focusHandler);

  // Polling fallback: on iPad in iPhone compatibility mode, browser lifecycle
  // events (browserPageLoaded, browserFinished, visibilitychange) may not fire
  // at all. Poll the transfer endpoint every 2s while auth is pending so the
  // user isn't stuck on a spinner forever.
  const pollInterval = setInterval(() => {
    if (resolved) {
      clearInterval(pollInterval);
      return;
    }
    if (pendingTransferKey) {
      tryResolveSession();
    }
  }, 2000);

  return () => {
    document.removeEventListener('visibilitychange', checkSession);
    window.removeEventListener('focus', focusHandler);
    window.removeEventListener('pageshow', focusHandler);
    clearInterval(pollInterval);
    pageLoadedListener.then(h => h.remove()).catch(() => {});
    browserListener.then(h => h.remove()).catch(() => {});
  };
}
