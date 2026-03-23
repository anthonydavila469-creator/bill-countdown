import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ transferKey: string }> },
) {
  const { transferKey } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || !transferKey) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Store tokens for the WKWebView to retrieve via the transfer API
  const admin = createAdminClient();
  await admin.from('auth_transfers').insert({
    transfer_key: transferKey,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  // Return a page that redirects back to the native app via custom URL scheme.
  // SFSafariViewController will close when the scheme is handled.
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{background:#0F0A1E;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{text-align:center;padding:24px}
.s{width:32px;height:32px;border:3px solid rgba(139,92,246,.3);border-top-color:#8B5CF6;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}
.btn{display:inline-block;margin-top:20px;padding:14px 32px;background:#8B5CF6;color:#fff;font-size:17px;font-weight:600;border-radius:12px;text-decoration:none;-webkit-tap-highlight-color:transparent}
.btn:active{background:#7C3AED}
.hint{display:none;margin-top:12px;color:#a1a1aa;font-size:14px}
</style>
</head>
<body><div class="c">
<div class="s" id="spinner"></div>
<p id="msg">Returning to Duezo...</p>
<a href="app.duezo://auth/callback" class="btn" id="openBtn" style="display:none">Open Duezo</a>
<p class="hint" id="hint">Tap the button above if you're not redirected automatically</p>
</div>
<script>
var scheme = 'app.duezo://auth/callback';
var universalLink = 'https://www.duezo.app/auth/return-to-app';

// Strategy 1: Universal Link (primary — triggers Associated Domains on iOS 13+)
setTimeout(function() { window.location.replace(universalLink); }, 300);

// Strategy 2: Custom URL scheme (fallback for older iOS)
setTimeout(function() {
  if (!document.hidden) {
    window.location.replace(scheme);
  }
}, 1200);

// Strategy 3: show manual button after 2s
setTimeout(function() {
  if (!document.hidden) {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('msg').textContent = 'Almost there!';
    document.getElementById('openBtn').style.display = 'inline-block';
    document.getElementById('hint').style.display = 'block';
  }
}, 2000);

setTimeout(function() {
  if (!document.hidden) {
    document.getElementById('msg').textContent = 'Tap below to return to the app';
  }
}, 5000);
</script>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
