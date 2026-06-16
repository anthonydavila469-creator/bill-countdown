// Gmail OAuth callback — DISABLED. Email scanning is not part of the current
// Duezo product (owner decision 2026-06-14). See lib/email/feature-status.ts
// and audits/EMAIL_PRIVACY_READINESS.md.
import { emailScanningDisabledResponse } from '@/lib/email/feature-status';

export async function GET() {
  return emailScanningDisabledResponse();
}
