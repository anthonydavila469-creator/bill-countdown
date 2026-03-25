import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SupabaseClient } from '@supabase/supabase-js';
import { apiFetch } from '@/lib/api-base';

// Custom native plugin — uses ASWebAuthenticationSession (auto-dismisses after auth)
// Falls back to @capacitor/browser if plugin isn't available (older builds)
interface WebAuthPlugin {
  start(options: { url: string; callbackScheme?: string }): Promise<{ url: string }>;
}

let WebAuth: WebAuthPlugin | null = null;
try {
  WebAuth = registerPlugin<WebAuthPlugin>('WebAuth');
} catch {
  console.log('[Auth] WebAuth plugin not available, will use Browser fallback');
}

/** Check if WebAuth native plugin is actually implemented */
async function hasWebAuth(): Promise<boolean> {
  if (!WebAuth) return false;
  try {
    // Try a harmless call — if the plugin isn't implemented natively, it throws
    await (WebAuth as any).echo?.({ value: 'test' });
    return true;
  } catch {
    return false;
  }
}

let useWebAuth: boolean | null = null;

// Module-level store for pending transfer key (native OAuth only)
let pendingTransferKey: string | null = null;

/**
 * Handle OAuth sign-in for both web and native Capacitor.
 *
 * On web: standard redirect flow.
 * On native (iPad/iPhone): uses ASWebAuthenticationSession which:
 *   1. Shows system prompt "Duezo wants to use X to sign in"
 *   2. Opens auth in a secure browser sheet
 *   3. AUTO-DISMISSES when the callback URL scheme fires
 *   4. Never leaves browser chrome stuck on screen
 */
export async function signInWithOAuthNative(
  supabase: SupabaseClient,
  provider: 'google' | 'apple',
): Promise<{ error?: string }> {
  const isNative = Capacitor.isNativePlatform();

  // For native: generate a transfer key to bridge session from auth browser to WKWebView
  if (isNative) {
    pendingTransferKey = crypto.randomUUID();
  }

  // Native MUST use www.duezo.app — non-www triggers Vercel 307 redirect that strips query params
  const baseUrl = isNative ? 'https://www.duezo.app' : window.location.origin;

  // Encode transfer_key in the URL path (not query params) because Supabase
  // rewrites the redirect URL and can strip custom query params during the
  // PKCE flow. Path segments are preserved reliably.
  const redirectTo = isNative
    ? `${baseUrl}/auth/callback/native/${pendingTransferKey}`
    : `${baseUrl}/auth/callback`;

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
    // Detect WebAuth availability once
    if (useWebAuth === null) {
      try {
        // Attempt to call the plugin — if not implemented, it throws with a specific message
        useWebAuth = !!WebAuth;
        if (WebAuth) {
          await WebAuth.start({ url: 'about:blank', callbackScheme: 'app.duezo' });
        }
      } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('not implemented') || msg.includes('not available')) {
          console.log('[Auth] WebAuth not available on this build, using Browser fallback');
          useWebAuth = false;
        } else {
          // Plugin exists but the test URL failed — that's expected
          useWebAuth = true;
        }
      }
    }

    if (useWebAuth && WebAuth) {
      try {
        // ASWebAuthenticationSession: opens auth flow, auto-closes on callback scheme
        const result = await WebAuth.start({
          url: data.url,
          callbackScheme: 'app.duezo',
        });

        console.log('[Auth] WebAuth returned:', result.url);
        // The session auto-dismissed. Now retrieve the tokens.
        await resolveSessionFromTransfer(supabase);
      } catch (err: any) {
        pendingTransferKey = null;
        if (err?.code === 'CANCELLED') {
          return { error: 'Sign-in was cancelled' };
        }
        console.error('[Auth] WebAuth error:', err);
        return { error: err?.message || 'Authentication failed' };
      }
    } else {
      // Fallback: use @capacitor/browser (SFSafariViewController)
      console.log('[Auth] Using Browser fallback (SFSafariViewController)');
      await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
    }
  }

  return {};
}

/**
 * Retrieve auth tokens via the transfer API after OAuth completes.
 */
async function resolveSessionFromTransfer(supabase: SupabaseClient): Promise<boolean> {
  if (!pendingTransferKey) return false;

  // Retry a few times — server may still be writing tokens
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`[Auth] Transfer attempt ${attempt}...`);
      const res = await apiFetch('/api/auth/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfer_key: pendingTransferKey }),
      });

      if (res.ok) {
        const { access_token, refresh_token } = await res.json();
        await supabase.auth.setSession({ access_token, refresh_token });
        console.log('[Auth] ✅ Session set from transfer');
        pendingTransferKey = null;
        return true;
      }
    } catch (err) {
      console.warn(`[Auth] Transfer attempt ${attempt} failed:`, err);
    }
    await new Promise((r) => setTimeout(r, attempt * 500));
  }

  console.error('[Auth] All transfer attempts failed');
  pendingTransferKey = null;
  return false;
}

/**
 * Listen for the app returning to foreground and retrieve the auth session.
 * This is now a FALLBACK — primary auth resolution happens inline after WebAuth.start().
 * Kept for edge cases (app killed during auth, deep link fallback, etc.)
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

    // Try transfer-based auth
    if (pendingTransferKey) {
      const success = await resolveSessionFromTransfer(supabase);
      if (success) {
        resolved = true;
        onAuthenticated();
        return;
      }
    }

    // Fallback: check if session exists
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        resolved = true;
        pendingTransferKey = null;
        onAuthenticated();
      }
    } catch (err) {
      console.warn('[Auth] getUser fallback failed:', err);
    }
  };

  const checkSession = async () => {
    if (document.visibilityState !== 'visible') return;
    await new Promise((r) => setTimeout(r, 1000));
    await tryResolveSession();
  };

  // Listen for deep link from custom URL scheme
  const appUrlListener = App.addListener('appUrlOpen', async (data) => {
    if (resolved) return;
    console.log('[Auth] appUrlOpen:', data.url);
    try { await Browser.close(); } catch { /* may already be closed */ }
    await new Promise((r) => setTimeout(r, 300));
    await tryResolveSession();
  });

  // Listen for pages loading inside SFSafariViewController (Browser fallback)
  const pageLoadedListener = Browser.addListener('browserPageLoaded', async () => {
    if (resolved || !pendingTransferKey) return;
    console.log('[Auth] browserPageLoaded fired, attempting session resolve...');
    for (let attempt = 1; attempt <= 6; attempt++) {
      if (resolved) return;
      await new Promise((r) => setTimeout(r, attempt * 800));
      await tryResolveSession();
    }
  });

  // Listen for browser closed (user tapped Done in SFSafariViewController)
  const browserListener = Browser.addListener('browserFinished', async () => {
    console.log('[Auth] browserFinished fired');
    for (let attempt = 1; attempt <= 5; attempt++) {
      if (resolved) return;
      await new Promise((r) => setTimeout(r, attempt * 700));
      await tryResolveSession();
    }
    if (!resolved && onDismissed) {
      pendingTransferKey = null;
      onDismissed();
    }
  });

  // Listen for app returning to foreground
  document.addEventListener('visibilitychange', checkSession);

  return () => {
    document.removeEventListener('visibilitychange', checkSession);
    appUrlListener.then(h => h.remove()).catch(() => {});
    pageLoadedListener.then(h => h.remove()).catch(() => {});
    browserListener.then(h => h.remove()).catch(() => {});
  };
}
