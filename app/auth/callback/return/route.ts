import { NextResponse } from 'next/server';

/**
 * Universal Link return endpoint.
 * When the app has Associated Domains configured, navigating to this URL
 * from SFSafariViewController will trigger iOS to dismiss the browser
 * and open the app directly (via Universal Links).
 *
 * If Universal Links aren't working (e.g., app not installed or entitlements
 * not configured), this returns a simple page that redirects via custom URL scheme.
 */
export async function GET() {
  // If we get here in a browser, Universal Links didn't fire — fall back to custom scheme
  return new NextResponse(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>window.location.href = 'app.duezo://auth/callback';</script>
<style>body{background:#0F0A1E;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.c{text-align:center;padding:24px}
.check{font-size:48px;margin-bottom:12px}
.btn{display:inline-block;margin-top:20px;padding:16px 40px;background:#8B5CF6;color:#fff;font-size:18px;font-weight:700;border-radius:14px;text-decoration:none;-webkit-tap-highlight-color:transparent;box-shadow:0 4px 14px rgba(139,92,246,.4)}
</style>
</head>
<body><div class="c">
<div class="check">✅</div>
<p><strong>You're signed in!</strong></p>
<a href="app.duezo://auth/callback" class="btn">Open Duezo</a>
<p style="margin-top:16px;color:#a1a1aa;font-size:14px">Returning to Duezo...</p>
</div>
</body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
