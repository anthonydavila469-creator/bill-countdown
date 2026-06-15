// Production-gated logging helpers.
//
// Bill payloads, payment URLs, email-derived fields, notification settings, and
// other preference/financial data must never land in Vercel/runtime logs. Use
// these helpers for any log line that could include such data: they are
// silenced when NODE_ENV === 'production' and behave like console.* otherwise.
//
// NODE_ENV is read at call time so the gate is testable and respects the
// runtime environment of each invocation.

export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
}

export function devError(...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.error(...args);
  }
}
