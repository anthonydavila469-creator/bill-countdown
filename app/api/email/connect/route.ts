import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider, type EmailProviderName } from '@/lib/email/providers';
import { createSignedState } from '@/lib/email/oauth-state';

function parseProvider(value: string | null): EmailProviderName | null {
  if (value === 'gmail' || value === 'yahoo' || value === 'outlook') {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    // Support token from query param (Capacitor in-app browser has no cookies)
    const accessToken = searchParams.get('access_token');
    let user;
    if (accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error || !data.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = data.user;
    } else {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = data.user;
    }

    const providerName = parseProvider(searchParams.get('provider')) || 'gmail';
    const provider = getProvider(providerName);
    const authUrl = new URL(provider.getAuthUrl());
    // Sign state with HMAC to prevent spoofing
    const stateData = accessToken
      ? createSignedState(providerName, user.id)
      : providerName;
    authUrl.searchParams.set('state', stateData);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error starting email OAuth:', errMsg);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.duezo.app';
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?error=connect_failed&details=${encodeURIComponent(errMsg)}`
    );
  }
}
