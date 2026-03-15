import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider, type EmailProviderName } from '@/lib/email/providers';

function parseProvider(value: string | null): EmailProviderName | null {
  if (value === 'gmail' || value === 'yahoo' || value === 'outlook') {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerName = parseProvider(searchParams.get('provider')) || 'gmail';
    const provider = getProvider(providerName);
    const authUrl = new URL(provider.getAuthUrl());
    authUrl.searchParams.set('state', providerName);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error starting email OAuth:', error);
    return NextResponse.json({ error: 'Failed to start email OAuth' }, { status: 500 });
  }
}
