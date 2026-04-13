# Duezo Homepage Recovery Handoff

Project: ~/Projects/bill-countdown
Primary file: app/page.tsx

Goal:
Recover the Duezo homepage visual quality after the current live regression.

What is wrong now:
- The hero no longer reads like a premium product landing page.
- The right-side product staging reads like a rounded screenshot card, not a real phone/product object.
- Spacing rhythm is too loose and creates dead space.
- The FAQ / lower-page spacing/alignment feels off.
- The page drifted from the stronger earlier visual direction Anthony responded better to.
- Do NOT treat this as a copy/SEO pass. This is a visual recovery pass.

Critical constraint:
Do NOT blindly revert old code. Older versions contained wrong product truth (email sync, login/signup entry, free-everything claims, old pricing, old app paths). Keep CURRENT truth and CURRENT routing, but restore a stronger visual system.

Source references:
1. Current broken homepage: app/page.tsx
2. Older stronger visual pattern reference in git: commit 03e62ef
   - Use this commit for composition ideas only:
     - stronger hero staging
     - more convincing product presentation
     - tighter CTA rhythm
   - Do NOT restore its wrong product claims.
3. Current product truth must remain:
   - no Gmail/email-import positioning
   - no sign in or signup public routing from homepage
   - App Store URL = https://apps.apple.com/us/app/duezo/id6759273131
   - pricing = free tier, $3.99/month, $19.99/year, 7-day free trial on yearly
   - no payment-history/export marketing claims
   - no Duezo wordmark in homepage branding if current direction is D-logo-only

What to fix in this pass:
1. HERO / PRODUCT STAGING
- Replace the current rounded screenshot-card feel with a more intentional product presentation.
- The right side must feel like a real phone/product object again, not just a screenshot in a box.
- Use the current approved screen asset(s), but present them better.
- Reduce dead space in the hero.
- Preserve the current copy direction unless tiny copy-fit changes are needed.

2. SPACING RHYTHM
- Tighten excessive vertical padding between sections.
- Reduce empty space that makes the page feel stretched.
- Improve balance between section headers and card grids.
- Keep it premium and breathable, but not loose or empty.

3. FAQ / LOWER PAGE ALIGNMENT
- Inspect the FAQ block and lower-page rhythm carefully.
- Ensure answer text padding/alignment feels intentional and centered within the layout system.
- Make the final CTA area feel tighter and cleaner.

4. DO NOT ADD NEW UI IDEAS
- No extra secondary nav rows
- No extra link strips
- No experiments
- No additional acquisition widgets
- No redesign of content structure beyond what is needed to restore polish

5. KEEP THESE GOOD THINGS
- Current product-truth copy
- Current legal/public truth cleanup
- Current App Store routing
- Current founder quote wording
- Current homepage headline direction if it still fits the recovered layout

Desired outcome:
- Feels like the stronger earlier direction Anthony liked
- Looks premium and intentional
- Real product presence in hero
- Better spacing
- No obvious dead space
- No weird FAQ alignment
- No stale or false product claims

Important:
This is a recovery pass, not a new concept.
Minimize code churn outside app/page.tsx.
If you need tiny supporting style adjustments elsewhere, keep them surgical.

After editing, report:
- what changed in hero/product staging
- what changed in spacing
- what changed in FAQ/final CTA alignment
- any remaining visual risks
