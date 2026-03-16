import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
      auth: {
        // Disable Navigator.locks — causes timeout errors in Capacitor WebView
        // and Safari background tabs. Falls back to tab-scoped locking instead.
        lock: 'no-op' as any,
      },
    }
  );
}
