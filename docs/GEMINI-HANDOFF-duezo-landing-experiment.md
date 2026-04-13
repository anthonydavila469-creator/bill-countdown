# Gemini Handoff — Duezo Landing Page Experiment

## Goal
Create a local-only alternative landing page experiment for Duezo so we can compare Gemini's visual/product-thinking against the current approved homepage.

## Critical Safety Constraint
- DO NOT edit `app/page.tsx`.
- DO NOT edit the current approved homepage.
- Build the experiment at `app/gemini-preview/page.tsx` only.
- If you need helper components, place them under `components/gemini-preview/`.
- This is local preview only. No deploy work.

## Business / Product Context
Duezo is a live iPhone app on the App Store.
It is NOT a budgeting app.
It is the bill countdown app for people who know what they owe but cannot keep track of when it is all due.

Core positioning:
- No bank linking
- No budgets
- iPhone-first
- Clear countdowns to due dates
- Built for people dealing with cognitive load / missed due dates

## Mandatory Messaging Framework
Use this positioning exactly:
- Duezo is the bill countdown app for people who know what they owe but can't keep track of when it's all due.
- No bank linking. No budgets. Just every bill, counted down to the day.

Avoid generic fintech language like:
- take control of your finances
- optimize your spending
- manage your finances
- all-in-one finance app
- autopilot

## Current Product Truth (confirmed from code)
App Store URL:
- https://apps.apple.com/us/app/duezo/id6759273131

Pricing:
- Free to download
- Free tier: up to 5 bills
- Pro Monthly: $3.99/month
- Pro Yearly: $19.99/year with 7-day free trial
- Do NOT mention lifetime on this page

Real features currently supported:
- Manual / quick add bill entry
- AI Photo Scan
- Push reminders
- Custom reminder timing for Pro
- Home screen widgets
- Calendar view
- Payment history
- Themes
- iPhone native app

Do NOT mention:
- Gmail scanning
- email parsing
- inbox import
- bank linking as a requirement
- budgeting / spending optimization
- export / CSV / PDF
- Android
- fake user counts
- fake testimonials

## Creative / Visual Direction
This should feel premium, dark, iPhone-native, and sharper than a generic SaaS template.

Visual preferences:
- dark background
- purple glow / premium glass treatment
- strong product-led composition
- real iPhone-style framing
- use actual current app screenshot, not placeholder art
- asymmetry is okay if it feels intentional
- avoid boring centered template feel

## Assets
Use these existing assets if useful:
- `public/new_dashboard.jpg` as the main current app screenshot
- D logo only if branding is needed; no wordmark recreation in CSS

## Requested Output
Create a full landing page experiment at:
- `app/gemini-preview/page.tsx`

Requirements:
- polished and visually distinct from the current approved homepage
- use current product truth only
- include hero, problem, product proof, why Duezo, pricing snapshot, FAQ, final CTA
- all CTAs should point to the App Store URL above
- no sign-in / login CTA
- no deploy changes

## Notes
This is an experiment route only. It is okay to take a stronger swing visually than the current approved homepage, but the page still needs to feel believable, premium, and product-truthful.