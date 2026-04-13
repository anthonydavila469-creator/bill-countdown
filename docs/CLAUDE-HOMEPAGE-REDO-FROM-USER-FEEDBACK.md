# Duezo Homepage Redo — User Feedback Is The Spec

Project: ~/Projects/bill-countdown
Primary file: app/page.tsx

This is a full homepage UI rebuild.
Do not preserve the current homepage layout just because it exists.
Anthony explicitly says the current page is still doing the same bad thing.

Context:
- Hermes tried rollback and partial fixes.
- That did NOT solve the real visual problem.
- The current live/local homepage is still unacceptable.
- Claude Code now owns the homepage rebuild.

Primary user complaints (treat these as hard requirements):
1. Dead space is bad
2. Phone mockup is wrong / not like it was
3. UI changed without approval
4. Stuff is missing from the page
5. Spacing is horrible
6. FAQ / answer section alignment feels off
7. The approved/original direction was stronger than the current version

Visual references from user screenshots:
- /Users/anthonydyess/.hermes/profiles/ops/cache/images/img_b4a04ca7df49.jpg
- /Users/anthonydyess/.hermes/profiles/ops/cache/images/img_046f4660b2ce.jpg
- /Users/anthonydyess/.hermes/profiles/ops/cache/images/img_86bde0ccf591.jpg
- /Users/anthonydyess/.hermes/profiles/ops/cache/images/img_b33a77b26a55.jpg
- /Users/anthonydyess/.hermes/profiles/ops/cache/images/img_b45bb350941c.jpg

You must visually anchor to those references, especially the stronger earlier hero/product direction.

What to rebuild in app/page.tsx:
- Hero
- Product mockup/presentation
- Spacing rhythm throughout the page
- FAQ section alignment and lower-page structure
- Pricing presentation if needed
- Overall layout balance

Non-negotiable design goals:
- Premium dark iPhone-first landing page
- Strong product presence
- No dead space / no generic blocky spacing
- No fake gimmicky phone shell if it looks fake
- If a phone frame is used, it must look excellent
- If not excellent, use a better premium product staging solution
- FAQ answers must feel properly aligned and intentional
- Overall page must feel like a polished product launch page, not a generic SaaS template

Product truth that MUST stay correct:
- no Gmail/email-import positioning
- no sign in or signup public routing from homepage
- App Store URL must be exactly: https://apps.apple.com/us/app/duezo/id6759273131
- pricing truth:
  - free tier exists
  - $3.99/month
  - $19.99/year
  - 7-day free trial on yearly
- no payment-history/export marketing claims
- keep D-logo-only branding treatment
- keep founder quote section, but you may improve layout around it

Allowed scope:
- you may fully rewrite app/page.tsx
- avoid touching other files unless absolutely necessary
- do not deploy

Strong preference:
- less cleverness, more taste
- less novelty, more conviction
- restore the original premium feel Anthony reacted well to

After editing, report:
1. what changed in hero/product presentation
2. how dead space was reduced
3. how spacing rhythm changed
4. how FAQ/alignment was fixed
5. any remaining visual risk
