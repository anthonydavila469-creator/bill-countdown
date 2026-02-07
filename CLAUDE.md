# Claude Instructions

## Working Principles

1. **Think First, Code Second** - Always think through the problem and read the codebase for relevant files before making changes.

2. **Check In Before Major Changes** - Before making any major changes, check in with me to verify the plan.

3. **High-Level Explanations** - Every step of the way, provide a high-level explanation of what changes were made.

4. **Simplicity Above All** - Make every task and code change as simple as possible. Avoid massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.

5. **Maintain Architecture Documentation** - Keep the `ARCHITECTURE.md` file updated when making structural changes.

6. **No Speculation** - Never speculate about code you have not opened. If I reference a specific file, you MUST read the file before answering. Investigate and read relevant files BEFORE answering questions about the codebase. Never make claims about code before investigating unless certain of the correct answer - give grounded and hallucination-free answers.

## Design & UI

Always use the `/frontend-design` skill for all UI and frontend work. This ensures production-grade, polished interfaces with high design quality.

## Tech Stack Quick Reference

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database:** Supabase (PostgreSQL + Auth)
- **AI:** Anthropic Claude (Sonnet)
- **Icons:** Lucide React

## Key Files

| Purpose | Location |
|---------|----------|
| Architecture docs | `ARCHITECTURE.md` |
| Types & interfaces | `types/index.ts` |
| Utility functions | `lib/utils.ts` |
| Theme/state | `contexts/theme-context.tsx` |
| Bill components | `components/bill-card.tsx` |
| API routes | `app/api/` |
| DB migrations | `supabase/migrations/` |

## Common Patterns

### Adding a new feature
1. Update types in `types/index.ts` if needed
2. Create/update API route in `app/api/`
3. Add migration if DB changes needed
4. Update components
5. Update `ARCHITECTURE.md` if structural change

### Styling conventions
- Use CSS variables for theme colors (e.g., `var(--accent-primary)`)
- Use `cn()` from `lib/utils` for conditional classes
- Dark theme is default (`bg-[#08080c]`)
- Glass morphism: `bg-white/[0.02] backdrop-blur-xl border-white/5`

### Database changes
1. Create new migration in `supabase/migrations/`
2. Name format: `00X_description.sql`
3. Always include RLS policies
4. Update types to match schema
