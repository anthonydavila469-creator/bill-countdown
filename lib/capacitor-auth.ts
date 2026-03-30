import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SupabaseClient } from '@supabase/supabase-js';
import { apiFetch } from '@/lib/api-base';

// Module-level store for pending transfer key (native OAuth only)
let pendingTransferKey: string | null = null;

/**
 * Handle OAuth sign-in for both web and native Capacitor.
 *
 * On web: standard redirect flow.
 * On native: opens SFSafariViewController via @capacitor/browser.
 * 
 * NOW WITH LOCAL BUNDLED APP: SFSafariViewController opens on duezo.app (external)
 * while the app loads from capacitor://localhost (local). These are DIFFERENT ORIGINS,
 * so when OAuth completes and redirects to app.duezo://, iOS will close SFVC
 * and open the native app. No more stuck browser chrome.
 */
export async function signInWithOAuthNative(
  supabase: SupabaseClient,
  provider: 'google' | 'apple',
): Promise<{ error?: string }> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    pendingTransferKey = crypto.randomUUID();
  }

  const baseUrl = isNative ? 'https://www.duezo.app' : window.location.origin;

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
    try {
      console.log('[Auth] Opening Browser for OAuth...');
      await Browser.open({ url: data.url, presentationStyle: 'fullscreen' });
    } catch (err: any) {
      console.error('[Auth] Browser.open failed:', err);
      pendingTransferKey = null;
      return { error: err?.message || 'Failed to open sign-in' };
    }
  }

  return {};
}

/**
 * Retrieve auth tokens via the transfer API after OAuth completes.
 */
async function resolveSessionFromTransfer(supabase: SupabaseClient): Promise<boolean> {
  if (!pendingTransferKey) return false;

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

    if (pendingTransferKey) {
      const success = await resolveSessionFromTransfer(supabase);
      if (success) {
        resolved = true;
        onAuthenticated();
        return;
      }
    }

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

  // Listen for deep link
  const appUrlListener = App.addListener('appUrlOpen', async (data) => {
    if (resolved) return;
    console.log('[Auth] appUrlOpen:', data.url);
    try { await Browser.close(); } catch { /* may already be closed */ }
    await new Promise((r) => setTimeout(r, 300));
    await tryResolveSession();
  });

  // Listen for pages loading inside SFSafariViewController
  const pageLoadedListener = Browser.addListener('browserPageLoaded', async () => {
    if (resolved || !pendingTransferKey) return;
    console.log('[Auth] browserPageLoaded fired');
    for (let attempt = 1; attempt <= 6; attempt++) {
      if (resolved) return;
      await new Promise((r) => setTimeout(r, attempt * 800));
      await tryResolveSession();
    }
  });

  // Listen for browser closed
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

  document.addEventListener('visibilitychange', checkSession);

  return () => {
    document.removeEventListener('visibilitychange', checkSession);
    appUrlListener.then(h => h.remove()).catch(() => {});
    pageLoadedListener.then(h => h.remove()).catch(() => {});
    browserListener.then(h => h.remove()).catch(() => {});
  };
}
