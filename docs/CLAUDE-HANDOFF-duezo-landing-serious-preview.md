# Claude Code Handoff — Duezo Serious Landing Preview

## Goal
Build a serious alternative Duezo landing page preview that is stronger than the Gemini experiments and closer to something we would actually consider shipping later.

This is NOT permission to touch the approved homepage.
The approved homepage must remain untouched.

## Hard Constraints
- DO NOT edit `app/page.tsx`
- DO NOT edit the current approved homepage
- Build only in `app/claude-preview/page.tsx`
- If helper components are needed, place them under `components/claude-preview/`
- Do not deploy anything
- Keep the existing `app/gemini-preview/page.tsx` route intact for comparison

## Context
The approved production homepage is currently locked and should not drift.
Gemini produced two isolated concept passes. V2 improved product proof by adding more phone/mockup moments, but it still felt too synthetic and concept-like.

What Gemini got right and you MAY borrow:
- stronger phone presence
- multiple product moments across the page
- more product-led composition
- more visual storytelling than a flat feature grid

What Gemini got wrong and you should FIX:
- too much fake/invented UI instead of believable product presentation
- AI scan section felt synthetic
- widget section felt fabricated instead of grounded
- overall still too "concept board" and not enough polished product page

## What success looks like
A high-taste landing page preview that:
- feels premium and iPhone-native
- uses stronger phone/mockup composition than the approved homepage
- still feels believable and restrained
- is grounded in real Duezo product truth
- looks like a real product marketing page, not a Dribbble experiment

## Locked Product Truth
App Store URL:
- https://apps.apple.com/us/app/duezo/id6759273131

Pricing:
- Free to download
- Free tier: up to 5 bills
- Pro monthly: $3.99/month
- Pro yearly: $19.99/year
- Yearly includes 7-day free trial
- Do NOT mention lifetime

Real features currently supported:
- manual / quick add entry
- AI Photo Scan
- push reminders
- custom reminder timing for Pro
- home screen widgets
- calendar view
- payment history
- themes
- native iPhone app

Do NOT mention:
- Gmail scanning
- email parsing
- inbox import
- budgeting/productivity generic language
- autopilot
- export / CSV / PDF
- Android
- fake social proof
- fake user counts
- fake testimonials

## Messaging guardrails
Duezo is NOT a budgeting app.
It solves cognitive load around bill due dates.

Use this positioning:
- Duezo is the bill countdown app for people who know what they owe but can't keep track of when it's all due.
- No bank linking. No budgets. Just every bill, counted down to the day.

Good headline territory:
- Every bill. Counted down.
- Never miss a bill again.
- Your brain can't track 10 due dates. Your phone can.

Avoid generic lines like:
- take control of your finances
- optimize your spending
- manage your finances
- all-in-one finance app

## Visual direction
This should feel more like a polished Apple-adjacent app landing page and less like a generic startup site.

Design goals:
- dark premium product page
- strong hierarchy
- fewer but better sections
- real phone/device presence
- product carries the page, not decoration
- restrained purple atmosphere, not neon overload
- asymmetry is okay if it feels intentional
- avoid giant generic feature-grid energy

## Product presentation rules
- Use believable iPhone mockups / device framing
- Prefer real screenshot-led composition over fake UI invention
- If reusing `public/new_dashboard.jpg`, do it intelligently:
  - different crops
  - layered composition
  - supporting proof moments
  - do NOT fabricate a bunch of fake app internals unless absolutely necessary
- It is okay to create tasteful supporting cards/callouts around the screenshot, but they should feel plausible and consistent with the real app

## Route structure suggestion
Use a structure like this, but improve if you have a better idea:
1. Hero with stronger phone composition
2. Short "why Duezo exists" / problem framing
3. Product proof section with 2–3 device/product moments
4. Why Duezo / no bank linking / no budgets / iPhone-native
5. Pricing snapshot
6. FAQ
7. Final CTA

## Technical requirements
- Create `app/claude-preview/page.tsx`
- Reuse existing project styles/tokens where sensible
- Keep code clean and production-quality
- Ensure TypeScript compiles
- All CTA links must go to the App Store URL above

## Additional instruction
Use your frontend/UI judgment aggressively here. This should be a noticeably better-designed route than the Gemini preview, but still truthful and grounded.

When finished:
- print a concise summary of files changed
- do not touch any route other than the isolated preview and any preview-only helper components