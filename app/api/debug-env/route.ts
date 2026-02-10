import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check all env vars for the key=value duplication bug
  const envChecks: Record<string, { length: number; prefix: string; hasKeyInValue: boolean }> = {};
  const keysToCheck = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REDIRECT_URI',
  ];
  
  for (const key of keysToCheck) {
    const val = process.env[key];
    if (val) {
      envChecks[key] = {
        length: val.length,
        prefix: val.substring(0, 30),
        hasKeyInValue: val.startsWith(key + '='),
      };
    }
  }
  
  return NextResponse.json({ envChecks, nodeVersion: process.version });
}
