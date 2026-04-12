You are working in the Duezo web repo.

Task:
Finish the Duezo public-site cleanup pass. A first cleanup pass already happened. This second pass must remove remaining public entry points into the old app and clean stale blog/public copy so the public site is consistent.

Critical instruction:
- Only edit public-facing marketing/site pages and directly related metadata/copy.
- Preserve unrelated work.
- Do not revert landing-page visual work.
- No deploys.

Product truth to enforce everywhere public-facing:
- Duezo is NOT an email-import / Gmail-sync product in public marketing.
- Remove public-facing claims about email import, Gmail sync, email parsing, Gmail scanning, or bill detection via email.
- Position Duezo around: bill countdowns, no bank linking, Quick Add, photo scan, reminders, widgets, calendar view, iPhone-first bill tracking.
- Current pricing truth:
  - Free tier exists
  - Pro monthly: $3.99/month
  - Pro yearly: $19.99/year
  - Yearly includes a 7-day free trial
- Anthony does NOT want users entering the old app anymore.
  - Replace public-facing `/signup` and similar old-app CTA entry points with the App Store URL: https://apps.apple.com/us/app/duezo/id6759273131
  - If a CTA cannot be truthfully kept, remove it rather than routing to old auth.

Priority work:
1. Replace remaining public `/signup` CTAs on marketing/comparison/alternative/blog pages with App Store links.
2. Clean blog pages that still contain stale pricing, old free/unlimited claims, Gmail/email-import positioning, or old-product truth.
3. Re-scan public-facing pages for old $4.99/$39.99 pricing and remove/update it.
4. Re-scan public-facing pages for email/Gmail marketing claims and remove/update them.

Known remaining pages to inspect carefully:
- app/prism-alternative/page.tsx
- app/about/page.tsx
- app/mint-alternative/page.tsx
- app/finovera-alternative/page.tsx
- app/vs/page.tsx
- app/vs/rocket-money/page.tsx
- app/vs/ynab/page.tsx
- app/vs/prism/page.tsx
- app/vs/mint/page.tsx
- app/vs/copilot-money/page.tsx
- app/vs/chronicle/page.tsx
- app/blog/best-bill-reminder-app-2026/page.tsx
- app/blog/best-prism-alternatives-2026/page.tsx
- app/blog/bill-tracker-no-bank-account/page.tsx
- app/blog/duezo-faq/page.tsx
- app/blog/why-simple-bill-tracker-beats-budgeting-apps/page.tsx

Legal pages:
- app/privacy/page.tsx
- app/terms/page.tsx
These may contain old Gmail references. If they are public marketing-ish and clearly stale, fix them. If they are legal/historical and you are not sure, do not invent. Flag them explicitly in remaining risks instead of guessing.

Validation:
- Run the narrowest useful checks after edits.
- Summarize all changed files.
- Explicitly list any remaining public pages still containing stale product truth if any remain.

Deliver back:
- Summary of work completed
- Files changed
- Validation performed
- Remaining risks / leftover stale pages
