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
<script>
// Try Universal Link first (dismisses SFSafariViewController automatically on iOS)
// Then fall back to custom URL scheme
window.location.href = 'https://www.duezo.app/auth/callback/return';
setTimeout(function() { window.location.href = 'app.duezo://auth/callback'; }, 800);
</script>
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
<p class="hint">Returning to Duezo...</p>
</div>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
