# CLAUDE.md — Duezo

## Role
You are a coding agent working inside the Duezo bill countdown app repository.

## Primary goals
- Make correct, minimal, production-appropriate code changes.
- Understand existing patterns before changing architecture.
- Keep diffs clean and focused.

## Tech stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **AI:** Anthropic Claude Sonnet (email parsing)
- **iOS:** Capacitor + native Swift bridge (widgets, push notifications)
- **Push:** APNs via @parse/node-apn
- **Icons:** Lucide React
- **Hosting:** Vercel (deploy with `vercel --prod`, auto-deploy is broken)
- **Domain:** duezo.app (OAuth MUST use www.duezo.app — non-www causes 307 redirects)

## Key files
| Purpose | Location |
|---------|----------|
| Architecture docs | `ARCHITECTURE.md` |
| Types & interfaces | `types/index.ts` |
| Utility functions | `lib/utils.ts` |
| Theme/state | `contexts/theme-context.tsx` |
| Bill components | `components/bill-card.tsx` |
| API routes | `app/api/` |
| DB migrations | `supabase/migrations/` |
| iOS bridge | `ios/App/App/BridgeViewController.swift` |
| Widget extension | `ios/App/DuezoWidgetExtension/` |

## Working rules
- Read relevant files before editing. Never speculate about code you haven't opened.
- Prefer root-cause fixes over surface patches.
- Preserve existing conventions unless they are clearly harmful.
- Do not introduce new dependencies unless justified.
- Do not refactor unrelated code.
- When a task is ambiguous, prefer the smallest safe implementation that satisfies the request.
- Keep changes as simple as possible. Simplicity above all.

## Design & UI
- Dark theme is default (`bg-[#08080c]`)
- Glass morphism: `bg-white/[0.02] backdrop-blur-xl border-white/5`
- Use CSS variables for theme colors (e.g., `var(--accent-primary)`)
- Use `cn()` from `lib/utils` for conditional classes

## Code standards
- Keep naming clear and consistent with surrounding code.
- Keep functions and components focused.
- Avoid duplication — reuse existing utilities first.
- Add comments only when they clarify non-obvious logic.
- Do not leave dead code behind.

## Database changes
1. Create migration in `supabase/migrations/`
2. Naming: `00X_description.sql`
3. Always include RLS policies
4. Update types to match schema

## Adding a new feature
1. Update types in `types/index.ts` if needed
2. Create/update API route in `app/api/`
3. Add migration if DB changes needed
4. Update components
5. Update `ARCHITECTURE.md` if structural change

## Env vars
- Use `printf` (not `echo`) when setting Vercel env vars — echo adds trailing \n that breaks keys

## Validation
- Run relevant checks when possible.
- If you cannot run tests or builds, say so explicitly.
- Never claim code is verified unless it was actually verified.

## Final response
Provide:
1. What changed
2. Why it changed
3. Files touched
4. Remaining risk or follow-up
