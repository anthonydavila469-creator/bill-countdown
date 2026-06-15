// Batch mailbox scan ("scan Gmail inbox for bill emails") — DISABLED. Email
// scanning is not part of the current Duezo product (owner decision 2026-06-14).
// This route fetched the user's mailbox via fetchProviderEmails(), so it is a
// mailbox scanning entry point and must stay off alongside gmail/* and email/*.
// See lib/email/feature-status.ts and audits/EMAIL_PRIVACY_READINESS.md.
import { emailScanningDisabledResponse } from '@/lib/email/feature-status';

export async function POST() {
  return emailScanningDisabledResponse();
}
