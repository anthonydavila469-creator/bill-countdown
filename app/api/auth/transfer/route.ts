import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Retrieve and consume a one-time auth transfer.
 * Used by Capacitor WKWebView to get session tokens after OAuth
 * completes in SFSafariViewController.
 *
 * Accepts transfer key via POST body or Authorization header
 * to avoid leaking it in URL query strings / server logs.
 */
export async function POST(request: Request) {
  let transferKey: string | null = null;

  // Try Authorization header first: "Bearer <transfer_key>"
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    transferKey = authHeader.slice(7).trim();
  }

  // Fall back to JSON body
  if (!transferKey) {
    try {
      const body = await request.json();
      transferKey = body.transfer_key ?? null;
    } catch {
      // ignore parse errors
    }
  }

  if (!transferKey) {
    return NextResponse.json({ error: 'Missing transfer key' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Reject transfers older than 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('auth_transfers')
    .select('access_token, refresh_token, created_at')
    .eq('transfer_key', transferKey)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Transfer not found or expired' }, { status: 404 });
  }

  // Delete after retrieval (one-time use) regardless of expiry
  await supabase
    .from('auth_transfers')
    .delete()
    .eq('transfer_key', transferKey);

  // Check expiry after deletion to prevent replay
  if (data.created_at && data.created_at < fiveMinutesAgo) {
    return NextResponse.json({ error: 'Transfer expired' }, { status: 410 });
  }

  return NextResponse.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
}
