import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL('/api/email/connect', request.url);
  url.searchParams.set('provider', 'gmail');
  return NextResponse.redirect(url);
}
