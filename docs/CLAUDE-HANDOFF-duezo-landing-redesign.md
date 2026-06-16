You are working in the Duezo web repo.

Task:
Use docs/PRD-duezo-landing-page-redesign.md as the primary brief and implement the strongest homepage redesign pass you can for the Duezo landing page.

Critical context you must honor:
- This is Duezo, not a budgeting app.
- Messaging must align with the Duezo messaging framework:
  - "Duezo is the bill countdown app for people who know what they owe but can't keep track of when it's all due. No bank linking. No budgets. Just every bill, counted down to the day."
- Avoid generic fintech language and avoid the word "autopilot".
- Lean into: no bank linking, iPhone-first, countdown UI, calm confidence, premium dark visual system.
- Use actual current product proof where possible.
- Prefer public/new_dashboard.jpg if you need the current dashboard screenshot.
- Do not use stale reference imagery if a current asset already exists.

Known product truth from current project context:
- Free tier: 5 bills, purple theme, basic reminders.
- Current local homepage already has newer positioning work in app/page.tsx, but it is not final.
- Production is still behind local and has not been approved yet.

Repository constraints:
- There are already local uncommitted changes in this repo. Preserve them.
- Do not revert unrelated work.
- Scope your edits to the landing page and any directly supporting files only.
- No deploys.

Implementation priorities:
1. Review app/page.tsx and any directly related styling/assets first.
2. Use the PRD to sharpen information architecture and premium iPhone-product feel.
3. Fix messaging drift and trust leaks inside the homepage itself.
4. Keep copy specific, short, and believable.
5. If exact live pricing details are not discoverable from code, avoid inventing numbers. Structure the pricing section honestly around what is confirmed.
6. Make the page feel launch-grade on both desktop and mobile.

Suggested files to inspect first:
- app/page.tsx
- app/layout.tsx
- app/globals.css
- public/new_dashboard.jpg
- docs/PRD-duezo-landing-page-redesign.md

Validation:
- Run the narrowest useful validation after edits.
- At minimum run the build if feasible.
- Report exact blockers if validation fails.

Deliver back:
- Summary of what changed
- Files changed
- Validation performed
- Open issues / risks
