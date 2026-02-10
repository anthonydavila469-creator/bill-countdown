import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return NextResponse.json({
    hasSupabaseUrl: !!url,
    supabaseUrlLength: url?.length,
    supabaseUrlPrefix: url?.substring(0, 30) || 'NOT SET',
    isValidUrl: url ? /^https?:\/\//.test(url) : false,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
    nodeVersion: process.version,
  });
}
