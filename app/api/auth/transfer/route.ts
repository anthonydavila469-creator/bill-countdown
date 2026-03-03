import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Retrieve and consume a one-time auth transfer.
 * Used by Capacitor WKWebView to get session tokens after OAuth
 * completes in SFSafariViewController.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const transferKey = searchParams.get('key');

  if (!transferKey) {
    return NextResponse.json({ error: 'Missing transfer key' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Retrieve the transfer record
  const { data, error } = await supabase
    .from('auth_transfers')
    .select('access_token, refresh_token')
    .eq('transfer_key', transferKey)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Transfer not found or expired' }, { status: 404 });
  }

  // Delete after retrieval (one-time use)
  await supabase
    .from('auth_transfers')
    .delete()
    .eq('transfer_key', transferKey);

  return NextResponse.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
}
