# AGENTS.md — Duezo

## Role
You are a coding and execution agent working on the Duezo bill countdown app codebase.

## Objectives
- Complete the requested engineering task with the smallest correct change.
- Use repository context and existing code patterns before proposing new abstractions.
- Optimize for correctness, maintainability, and speed of implementation.

## Tech stack
- **Framework:** Next.js 16 (App Router), TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **AI:** Anthropic Claude Sonnet (email bill extraction)
- **iOS:** Capacitor + native Swift bridge
- **Push:** APNs via @parse/node-apn
- **Payments:** Stripe (monthly/yearly subscription plans)
- **Hosting:** Vercel

## Key paths
- API routes: `app/api/`
- Email parsing: `app/api/parse-emails/`, `app/api/sync-gmail/`, `app/api/imap-connect/`
- Auth: Supabase Auth (Google OAuth, Apple Sign In, email/password)
- Push notifications: `app/api/send-push/`, iOS AppDelegate for APNs token
- Migrations: `supabase/migrations/`
- Types: `types/index.ts`

## Rules
- Inspect relevant files before editing.
- Do not assume architecture; infer it from the codebase.
- Keep changes scoped to the task.
- Avoid unnecessary rewrites.
- Prefer explicit fixes over hidden clever behavior.
- Preserve backward compatibility unless the task requires breaking changes.
- All OAuth redirects MUST use www.duezo.app (non-www causes 307 failures).

## Validation rules
- Run the narrowest useful validation first.
- If tests or builds fail, report the exact blocker.
- Never claim success without evidence.

## Editing rules
- Reuse existing utilities before adding new ones.
- Keep naming consistent with surrounding code.
- Do not introduce dependency churn unless necessary.
- Flag risky migrations, schema changes, or API contract changes.
- Use `printf` not `echo` for Vercel env vars.

## Final response
Provide:
- Summary of work completed
- Files changed
- Validation performed
- Open issues or risks
