// Inbound bill-email webhook (AgentMail forward-to-inbox) — DISABLED. Inbound
// email parsing is not part of the current Duezo product (owner decision
// 2026-06-14). See lib/email/feature-status.ts and
// audits/EMAIL_PRIVACY_READINESS.md.
//
// Disabling this route also removes the prior debug-log insert that captured
// the first 2,000 chars of the raw inbound payload (Privacy P1-3). No raw email
// content is read, parsed, or persisted here.
import { emailScanningDisabledResponse } from '@/lib/email/feature-status';

export async function POST() {
  return emailScanningDisabledResponse();
}
