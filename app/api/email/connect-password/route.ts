import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth/get-authenticated-user';
import { YahooImapClient, type ProviderTokens } from '@/lib/email/providers';
import { persistEmailConnection } from '@/lib/email/tokens';

function isYahooProvider(value: unknown): value is 'yahoo' {
  return value === 'yahoo';
}

export async function POST(request: Request) {
  let imapClient: YahooImapClient | null = null;

  try {
    const { user } = await getAuthenticatedUser(request);
    const supabase = await createClient();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as {
      email?: string;
      appPassword?: string;
      provider?: string;
    } | null;

    const email = body?.email?.trim();
    const appPassword = body?.appPassword?.trim();
    const provider = body?.provider;

    if (!email || !appPassword || !isYahooProvider(provider)) {
      return NextResponse.json(
        { error: 'Email, app password, and provider=yahoo are required' },
        { status: 400 }
      );
    }

    imapClient = new YahooImapClient();
    await imapClient.connect();
    await imapClient.authenticateWithPassword(email, appPassword);
    await imapClient.selectInbox();

    const tokens: ProviderTokens = {
      access_token: appPassword,
      refresh_token: 'app_password',
      expires_at: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
      email,
    };

    await persistEmailConnection(supabase, user.id, 'yahoo', tokens);

    return NextResponse.json({
      success: true,
      provider: 'yahoo',
      email,
    });
  } catch (error) {
    console.error('Yahoo app password connect error:', error);
    return NextResponse.json(
      { error: 'Failed to validate Yahoo IMAP credentials' },
      { status: 400 }
    );
  } finally {
    imapClient?.close();
  }
}
