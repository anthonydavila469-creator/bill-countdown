// Email-parser drift detection cron — DISABLED. This operated on the email
// parser learning data (email_parse_runs / emails_raw); email scanning is not
// part of the current Duezo product (owner decision 2026-06-14). The cron entry
// was removed from vercel.json; this handler is kept as a safe no-op. See
// lib/email/feature-status.ts and audits/EMAIL_PRIVACY_READINESS.md.
//
// Not to be confused with the live screenshot-scanner learning crons
// (biller-profile-builder, extraction-learning-pass), which remain active.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ disabled: true, processed: 0 });
}
