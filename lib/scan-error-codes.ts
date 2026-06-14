// Stable, app-owned scanner error codes (Privacy audit P1-6).
//
// The scan routes used to return and persist raw provider/model error
// text (e.g. `${error.name}: ${error.message}`) into response warnings,
// the `scan_attempts.vision_error` column, and `bill_scan_sessions.
// error_code`. Provider messages are outside our control and can drift
// or carry diagnostic text we never want surfaced to the app or stored
// in telemetry.
//
// This module maps any thrown error to one of a small set of stable
// codes the app and our own analytics own. Raw provider details are kept
// ONLY in controlled server logs via `logScanError`, never returned or
// persisted.

export type ScanErrorCode =
  | 'invalid_image'
  | 'model_timeout'
  | 'model_rate_limited'
  | 'model_overloaded'
  | 'model_auth_failed'
  | 'model_call_failed'
  | 'network_error'
  | 'unknown_error';

/**
 * Classifies an arbitrary thrown value into a stable scanner error code.
 *
 * Recognizes the Anthropic SDK error shape (numeric `.status` plus an
 * error `.name`) and a few transport-level names. Falls back to
 * `unknown_error` so a new/unrecognized failure never leaks raw text.
 */
export function classifyScanError(error: unknown): ScanErrorCode {
  const name = error instanceof Error ? error.name.toLowerCase() : '';
  const rawStatus = (error as { status?: unknown } | null)?.status;
  const status = typeof rawStatus === 'number' ? rawStatus : undefined;

  // Transport-level signals come through by name, often without a status.
  if (name.includes('timeout')) return 'model_timeout';
  if (name.includes('connection')) return 'network_error';

  if (status !== undefined) {
    if (status === 408) return 'model_timeout';
    if (status === 429) return 'model_rate_limited';
    if (status === 529) return 'model_overloaded';
    if (status === 401 || status === 403) return 'model_auth_failed';
    // The only caller-variable input on the scan path is the image, so a
    // 400/422 from the model is treated as an unreadable/invalid image.
    if (status === 400 || status === 422) return 'invalid_image';
    if (status >= 500) return 'model_call_failed';
    if (status >= 400) return 'model_call_failed';
  }

  return 'unknown_error';
}

/**
 * Stable, app-owned, user-safe message for a scanner error code. Never
 * contains provider text. Safe to return to the app or show in a review
 * sheet detail line.
 */
export function scanErrorMessage(code: ScanErrorCode): string {
  switch (code) {
    case 'invalid_image':
      return 'The image could not be read.';
    case 'model_timeout':
      return 'The scan timed out. Please try again.';
    case 'model_rate_limited':
      return 'The scanner is busy right now. Please try again in a moment.';
    case 'model_overloaded':
      return 'The scanner is temporarily overloaded. Please try again.';
    case 'model_auth_failed':
      return 'The scanner is unavailable right now. Please try again later.';
    case 'network_error':
      return 'A network error interrupted the scan. Please try again.';
    case 'model_call_failed':
    case 'unknown_error':
      return 'The scan could not be completed. Please try again.';
  }
}

/**
 * Logs the raw error to the controlled server log and returns the stable
 * code. This is the only place raw provider/model text is allowed; the
 * returned code is what may be sent to the app or stored in telemetry.
 */
export function logScanError(scope: string, error: unknown): ScanErrorCode {
  const code = classifyScanError(error);
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[${scope}] scan failed code=${code} detail=${detail}`);
  return code;
}
