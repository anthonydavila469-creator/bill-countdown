// Mailbox / email scanning launch posture (owner decision 2026-06-14).
//
// Email scanning — Gmail/Yahoo/Outlook mailbox OAuth, mailbox auto-sync,
// inbound (forward-to-inbox) email parsing, raw email storage, and the email
// parser learning loop — is NOT part of the current Duezo product. It is
// old-project baggage. The owner decided to disable every public entry point
// rather than maintain it for launch (see audits/EMAIL_PRIVACY_READINESS.md).
//
// This module is the single source of truth that all former email routes
// delegate to, so "disabled" is defined in exactly one place and is unit
// testable. It deliberately imports nothing from Next.js and uses the global
// `Response`, so `node --test` can import it directly (the .ts is type-stripped
// at import time, same as the other lib tests).

// Hard off. If email scanning is ever revived it must first satisfy the P0/P1
// privacy work in audits/EMAIL_PRIVACY_READINESS.md (token encryption,
// retention, RLS, restricted-scope compliance) before this flips to true.
export const EMAIL_SCANNING_ENABLED = false as const;

// Stable, app-owned code returned by every disabled email endpoint. Clients
// (and tests) can match on this without parsing prose.
export const EMAIL_SCANNING_DISABLED_CODE = 'email_scanning_disabled' as const;

export const EMAIL_SCANNING_DISABLED_BODY = {
  error: EMAIL_SCANNING_DISABLED_CODE,
  message: 'Email scanning is not available.',
} as const;

// Standard response for a disabled email entry point. 404 so the capability is
// indistinguishable from "no such feature" — we do not advertise that mailbox
// scanning ever existed. A plain web `Response` is returned (Next.js route
// handlers accept it) to keep this module free of Next imports for testing.
export function emailScanningDisabledResponse(): Response {
  return new Response(JSON.stringify(EMAIL_SCANNING_DISABLED_BODY), {
    status: 404,
    headers: { 'content-type': 'application/json' },
  });
}
