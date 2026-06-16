You are working in the Duezo web repo.

Task:
Do a truth-cleanup pass on public-facing Duezo marketing/site pages. This is not a broad redesign. Fix stale product claims so the public site matches the current app.

Critical instruction:
- Only edit the code/files needed for this cleanup.
- Preserve existing in-progress landing page visual work.
- Do not revert unrelated changes.
- No deploys.

Current product truth to enforce:
- Duezo is NOT an email-import product anymore for public marketing.
- Remove public-facing claims about email import, Gmail sync, email parsing, Gmail scanning, or bill detection via email.
- Position Duezo around: bill countdowns, no bank linking, Quick Add, photo scan, reminders, widgets, calendar view, iPhone-first bill tracking.
- Current pricing truth:
  - Free tier exists
  - Pro monthly: $3.99/month
  - Pro yearly: $19.99/year
  - Yearly has a 7-day free trial
- Homepage currently contains a contradiction that must be fixed:
  - It says both that there is no trial pressure and that yearly has a 7-day trial.
  - Remove the contradictory “No trial countdown pressure” language.
- Anthony explicitly says to remove the homepage marketing claim about “Payment history & export” from pricing/public marketing.
  - Even if there is old code somewhere, treat the public claim as unsafe and remove it from public-facing pricing copy.
- Anthony also wants the landing page/header/footer branding cleaned up so it uses ONLY the D logo mark and not the Duezo wordmark image.
  - Remove the Duezo wordmark image from the homepage chrome/branding where it is currently paired with the D logo.
  - Keep the D logo only.
- Anthony does NOT want users entering the old app anymore.
  - Remove the Sign in link from the homepage/nav/public marketing entry points.
  - Do not drive public users into the old app/auth flow from the marketing homepage.

Pages/files to inspect first:
- app/page.tsx
- app/layout.tsx
- app/about/page.tsx
- app/mint-alternative/page.tsx
- app/finovera-alternative/page.tsx
- app/vs/prism/page.tsx
- app/vs/mint/page.tsx
- app/vs/copilot-money/page.tsx
- app/vs/chronicle/page.tsx

Specific fixes expected:
1. Homepage:
   - remove FAQ item about email import / Gmail sync
   - remove “Payment history & export” style marketing claims from pricing/features
   - fix the pricing contradiction around trial language
   - remove the Duezo wordmark image and keep D-logo-only branding in the homepage nav/footer branding treatment
   - remove the Sign in link / public entry path into the old app from the homepage nav
2. About page:
   - remove email parsing claim
   - remove false “Every feature, no limits, no cost” claim
3. Comparison / alternative pages:
   - remove public claims that Duezo works via Gmail/email scanning
   - update stale pricing from old $4.99 / $39.99 to current pricing where pricing is mentioned
   - update metadata/schema copy if it still references email scanning or stale pricing
4. Global metadata:
   - app/layout.tsx should stop using stale/too-broad positioning like spending analytics, budget tracker, autopay tracker if still present

Validation:
- Run the narrowest useful checks you can after edits.
- Summarize exactly which files changed.
- Call out any remaining public pages that still contain stale product truth if you find them.

Deliver back:
- Summary of work completed
- Files changed
- Validation performed
- Remaining risks / stale pages still needing follow-up
