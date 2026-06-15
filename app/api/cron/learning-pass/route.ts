// Email-parser learning pass cron — DISABLED. This generated/promoted email
// parser vendor templates from email_parse_runs / learning_events; email
// scanning is not part of the current Duezo product (owner decision
// 2026-06-14). The cron entry was removed from vercel.json; this handler is
// kept as a safe no-op. See lib/email/feature-status.ts and
// audits/EMAIL_PRIVACY_READINESS.md.
//
// Not to be confused with the live screenshot-scanner learning crons
// (biller-profile-builder, extraction-learning-pass), which remain active.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ disabled: true, generatedCandidates: 0, vendorsProcessed: 0 });
}
