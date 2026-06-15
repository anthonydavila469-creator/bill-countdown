// AI email bill parsing ("parse these emails for bills") — DISABLED. Email
// scanning is not part of the current Duezo product (owner decision
// 2026-06-14). This route accepted user-submitted email bodies and fed them
// into the legacy Claude email-extraction pipeline (lib/ai/extract-bill.ts),
// so it is an email-scanning entry point and must stay off alongside gmail/*,
// email/*, inbound/*, and suggestions.
// See lib/email/feature-status.ts and audits/EMAIL_PRIVACY_READINESS.md.
import { emailScanningDisabledResponse } from '@/lib/email/feature-status';

export async function POST() {
  return emailScanningDisabledResponse();
}
