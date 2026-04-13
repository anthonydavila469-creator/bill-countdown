# Gemini Handoff — Duezo Landing Experiment V2

## Goal
Revise the local-only Duezo landing page experiment so it feels more product-led and visually specific.

The first Gemini pass was usable, but too flat and too generic.
This revision must push harder on product proof by using multiple iPhone-style mockups/screens instead of a single generic hero phone.

## Hard Safety Rules
- DO NOT edit `app/page.tsx`
- DO NOT edit the approved homepage
- Only edit `app/gemini-preview/page.tsx`
- Keep this local-only
- No deploy work

## Required Improvements Over V1
1. Add more phone mockups / product frames
   - not just one hero phone
   - show at least 2–3 product moments across the page
   - examples: main dashboard, AI photo scan, calendar/widgets/payment-history section
2. Make the page feel less like a generic dark SaaS page
3. Increase visual depth and premium feel
4. Keep product truth exact
5. Keep the D-logo only approach on the page header/nav; do not add a Duezo wordmark text label beside the logo

## Product Truth (locked)
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
- manual / quick add bill entry
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
- budgeting language
- autopilot
- export/CSV/PDF
- Android
- fake social proof
- fake user counts

## Messaging Guardrails
Use this positioning:
- Duezo is the bill countdown app for people who know what they owe but can't keep track of when it's all due.
- No bank linking. No budgets. Just every bill, counted down to the day.

Preferred headline territory:
- Every bill. Counted down.
- Never miss a bill again.
- Your brain can't track 10 due dates. Your phone can.

Keep it direct. Avoid generic fintech copy.

## Visual Direction
- premium dark iPhone-first product page
- purple glow is fine, but not enough by itself
- needs stronger compositional structure
- actual phone/device feel matters
- product should carry the page, not just text blocks
- asymmetry is welcome if intentional
- avoid flat feature-grid-overuse

## Assets
Prefer these real assets if available:
- `public/new_dashboard.jpg`

If additional current screenshots are not available, you may reuse the main dashboard image in different mockup crops/treatments, but the composition should still feel intentional and product-led.

## Deliverable
Revise `app/gemini-preview/page.tsx` so it includes:
- a stronger hero with iPhone mockup treatment
- at least 2 additional product-mockup moments further down the page
- less template energy
- better visual hierarchy than V1
- all CTAs going to the App Store URL

When done, print a concise summary of what changed.