import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const transferKey = searchParams.get('transfer_key');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Native Capacitor flow: store tokens for WKWebView to retrieve
      if (transferKey) {
        const admin = createAdminClient();
        await admin.from('auth_transfers').insert({
          transfer_key: transferKey,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        // Redirect to app URL scheme — this triggers appUrlOpen in the native app.
        // Works reliably on both iPhone and iPad (including iPad compatibility mode)
        // because it doesn't depend on SFSafariViewController lifecycle events.
        const appSchemeUrl = `app.duezo://auth-callback?transfer_key=${transferKey}`;
        return NextResponse.redirect(appSchemeUrl);
      }

      // Standard web flow: redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
