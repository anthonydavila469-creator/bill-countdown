// Daily mailbox auto-sync cron — DISABLED. Email scanning is not part of the
// current Duezo product (owner decision 2026-06-14). The cron entry was removed
// from vercel.json and the daily-tasks cron no longer invokes this route, but
// the handlers are kept as safe no-ops so any lingering scheduler call (or a
// stale deploy) performs no mailbox access and writes nothing. See
// lib/email/feature-status.ts and audits/EMAIL_PRIVACY_READINESS.md.

import { NextResponse } from 'next/server';

const DISABLED_RESULT = {
  disabled: true,
  processed: 0,
  message: 'Email auto-sync is disabled.',
} as const;

export async function POST() {
  return NextResponse.json(DISABLED_RESULT);
}

export async function GET() {
  return NextResponse.json(DISABLED_RESULT);
}
