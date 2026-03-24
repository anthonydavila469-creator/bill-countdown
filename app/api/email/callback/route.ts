import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider, getProviderLabel, type EmailProviderName } from '@/lib/email/providers';
import { persistEmailConnection } from '@/lib/email/tokens';
import { verifySignedState } from '@/lib/email/oauth-state';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.duezo.app';
const NATIVE_SETTINGS_URL = 'duezo://settings';

function parseProvider(value: string | null): EmailProviderName {
  if (value === 'yahoo' || value === 'outlook') {
    return value;
  }

  return 'gmail';
}

function buildSettingsRedirect(
  isNativeApp: boolean,
  params: Record<string, string | null | undefined>
) {
  const baseUrl = isNativeApp ? NATIVE_SETTINGS_URL : `${APP_URL}/dashboard/settings`;
  const redirectUrl = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      redirectUrl.searchParams.set(key, value);
    }
  }

  return redirectUrl.toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawState = searchParams.get('state') || searchParams.get('provider') || 'gmail';

  // Try to verify as a signed state (provider:userId:timestamp:hmac)
  const signedResult = verifySignedState(rawState);
  let providerPart: string;
  let userIdFromState: string | null;

  if (signedResult) {
    providerPart = signedResult.provider;
    userIdFromState = signedResult.userId;
  } else if (!rawState.includes(':')) {
    // Simple provider-only state (web flow, no user ID in state)
    providerPart = rawState;
    userIdFromState = null;
  } else {
    // Signed state that failed verification — reject it
    const fallbackProvider = parseProvider(rawState.split(':')[0]);
    return NextResponse.redirect(buildSettingsRedirect(false, {
      error: 'invalid_state',
      provider: fallbackProvider,
    }));
  }

  const providerName = parseProvider(providerPart);
  const isNativeApp = Boolean(userIdFromState);

  try {
    const code = searchParams.get('code');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      return NextResponse.redirect(buildSettingsRedirect(isNativeApp, {
        error: 'oauth_denied',
        provider: providerName,
      }));
    }

    if (!code) {
      return NextResponse.redirect(buildSettingsRedirect(isNativeApp, {
        error: 'no_code',
        provider: providerName,
      }));
    }

    const supabase = await createClient();
    let userId: string;

    if (userIdFromState) {
      // Capacitor flow — user ID passed via state (in-app browser has no cookies)
      userId = userIdFromState;
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        if (isNativeApp) {
          return NextResponse.redirect(buildSettingsRedirect(true, { error: 'unauthorized' }));
        }

        return NextResponse.redirect(`${APP_URL}/login?error=unauthorized`);
      }
      userId = user.id;
    }

    const provider = getProvider(providerName);
    const tokens = await provider.exchangeCode(code);
    await persistEmailConnection(supabase, userId, providerName, tokens);

    const providerLabel = getProviderLabel(providerName);
    return NextResponse.redirect(buildSettingsRedirect(isNativeApp, {
      gmail: 'connected',
      provider: providerName,
      provider_connected: providerLabel,
    }));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Email OAuth callback error:', errMsg);
    return NextResponse.redirect(buildSettingsRedirect(isNativeApp, {
      error: 'callback_failed',
      details: errMsg,
      provider: providerName,
    }));
  }
}
