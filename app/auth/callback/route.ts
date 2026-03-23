import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Detect if request is from an iOS/macOS device (SFSafariViewController in Capacitor app)
// Broad check — better to show the "Open Duezo" page unnecessarily than to load
// the dashboard inside SFSafariViewController
function isAppleDevice(request: Request): boolean {
  const ua = request.headers.get('user-agent') || '';
  // Match iPhone, iPad (including desktop-mode iPad that sends "Macintosh"),
  // iPod, and Safari on macOS (which could be SFSafariViewController)
  return /iPhone|iPad|iPod|Macintosh.*Safari/.test(ua);
}

// The "return to app" HTML page shown after OAuth in SFSafariViewController.
// Multiple redirect strategies to maximize compatibility across iOS versions.
function nativeReturnPage(): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{background:#0F0A1E;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{text-align:center;padding:24px}
.check{font-size:48px;margin-bottom:12px}
.btn{display:inline-block;margin-top:20px;padding:16px 40px;background:#8B5CF6;color:#fff;font-size:18px;font-weight:700;border-radius:14px;text-decoration:none;-webkit-tap-highlight-color:transparent;box-shadow:0 4px 14px rgba(139,92,246,.4)}
.btn:active{background:#7C3AED;transform:scale(0.97)}
.hint{margin-top:16px;color:#a1a1aa;font-size:14px}
</style>
</head>
<body><div class="c">
<div class="check">✅</div>
<p><strong>You're signed in!</strong></p>
<a href="app.duezo://auth/callback" class="btn">Open Duezo</a>
<p class="hint">Tap the button to return to the app</p>
</div>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const transferKey = searchParams.get('transfer_key');
  const isApple = isAppleDevice(request);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Native Capacitor flow with transfer key: store tokens for WKWebView
      if (transferKey) {
        const admin = createAdminClient();
        await admin.from('auth_transfers').insert({
          transfer_key: transferKey,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        return nativeReturnPage();
      }

      // iOS device but no transfer key (Supabase stripped it during redirect).
      // Still redirect back to the app — the WKWebView will detect the session
      // when it regains focus via visibilitychange / browserFinished listeners.
      if (isApple) {
        return nativeReturnPage();
      }

      // Standard web flow: redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
