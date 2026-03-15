import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider, getProviderLabel, type EmailProviderName } from '@/lib/email/providers';
import { persistEmailConnection } from '@/lib/email/tokens';

function parseProvider(value: string | null): EmailProviderName {
  if (value === 'yahoo' || value === 'outlook') {
    return value;
  }

  return 'gmail';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');
    const providerName = parseProvider(searchParams.get('state') || searchParams.get('provider'));

    if (oauthError) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=oauth_denied&provider=${providerName}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=no_code&provider=${providerName}`
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login?error=unauthorized`);
    }

    const provider = getProvider(providerName);
    const tokens = await provider.exchangeCode(code);
    await persistEmailConnection(supabase, user.id, providerName, tokens);

    const providerLabel = encodeURIComponent(getProviderLabel(providerName));
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?gmail=connected&provider=${providerName}&provider_connected=${providerLabel}`
    );
  } catch (error) {
    console.error('Email OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=callback_failed`
    );
  }
}
