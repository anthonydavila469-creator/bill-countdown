import { NextResponse } from 'next/server';

// Stripe IAP disabled — app is free with all features unlocked
export async function POST() {
  return NextResponse.json({ error: 'Not available' }, { status: 503 });
}
export async function GET() {
  return NextResponse.json({ error: 'Not available' }, { status: 503 });
}
