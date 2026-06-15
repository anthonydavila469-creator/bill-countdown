// Shared fail-closed bearer-secret check for server-to-server endpoints
// (RevenueCat webhook, cron routes). The security rule is: if the expected
// secret is missing or empty in the environment, the request must be REJECTED,
// never trusted. Routes previously only enforced auth when the secret happened
// to be set, which fails OPEN if the env var is ever absent.
//
// This is a pure function with no framework imports so it can be unit-tested
// directly. Route handlers wrap it and translate the result into a response.

export type SecretAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; reason: 'missing_secret' | 'unauthorized' };

/**
 * Validate an incoming `Authorization` header against an expected secret.
 *
 * Fails CLOSED: a missing/empty `secret` yields a 500 `missing_secret` result
 * rather than allowing the request through.
 */
export function checkBearerSecret(
  authHeader: string | null | undefined,
  secret: string | null | undefined
): SecretAuthResult {
  if (!secret) {
    return { ok: false, status: 500, reason: 'missing_secret' };
  }
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return { ok: false, status: 401, reason: 'unauthorized' };
  }
  return { ok: true };
}
