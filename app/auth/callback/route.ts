import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Detect if request is from an iOS device (SFSafariViewController in Capacitor app)
function isIOSDevice(request: Request): boolean {
  const ua = request.headers.get('user-agent') || '';
  return /iPhone|iPad|iPod/.test(ua);
}

// The "return to app" HTML page shown after OAuth in SFSafariViewController.
// Multiple redirect strategies to maximize compatibility across iOS versions.
function nativeReturnPage(): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{background:#0F0A1E;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{text-align:center;padding:24px}
.s{width:32px;height:32px;border:3px solid rgba(139,92,246,.3);border-top-color:#8B5CF6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
.btn{display:inline-block;margin-top:20px;padding:14px 32px;background:#8B5CF6;color:#fff;font-size:17px;font-weight:600;border-radius:12px;text-decoration:none;-webkit-tap-highlight-color:transparent}
.btn:active{background:#7C3AED}
.hint{margin-top:12px;color:#a1a1aa;font-size:14px;display:none}
</style>
</head>
<body><div class="c">
<div class="s" id="spinner"></div>
<p id="msg">Returning to Duezo...</p>
<a href="app.duezo://auth/callback" class="btn" id="openBtn" style="display:none">Open Duezo</a>
<p class="hint" id="hint">Tap the button to return to the app</p>
</div>
<script>
var scheme = 'app.duezo://auth/callback';

// Strategy 1: immediate location.replace
setTimeout(function() { window.location.replace(scheme); }, 300);

// Strategy 2: hidden iframe for older iOS
setTimeout(function() {
  if (!document.hidden) {
    var f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = scheme;
    document.body.appendChild(f);
  }
}, 800);

// Strategy 3: show manual button after 1.5s
setTimeout(function() {
  if (!document.hidden) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('msg').textContent = 'You\\'re signed in!';
    document.getElementById('openBtn').style.display = 'inline-block';
    document.getElementById('hint').style.display = 'block';
  }
}, 1500);
</script>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const transferKey = searchParams.get('transfer_key');
  const isIOS = isIOSDevice(request);

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
      if (isIOS) {
        return nativeReturnPage();
      }

      // Standard web flow: redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange failed, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
