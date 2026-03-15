import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL('/api/email/callback', request.url);
  const currentUrl = new URL(request.url);

  currentUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  url.searchParams.set('provider', 'gmail');
  return NextResponse.redirect(url);
}
