Task: create an isolated Duezo homepage comparison variant that keeps the newly-liked hero composition but swaps the right-side product presentation to showcase 3 different real Duezo themes/screens.

Project
- Repo: /Users/anthonydyess/Projects/bill-countdown
- Do NOT overwrite the approved homepage at app/page.tsx
- Build this as a separate preview route only
- Suggested route: /theme-preview via app/theme-preview/page.tsx

Critical constraints
- Keep the liked hero composition language from the current homepage pass:
  - left-side copy block
  - right-side premium phone/mockup staging
  - dark premium overall feel
  - same general CTA hierarchy
- This is a comparison experiment only. Main homepage must stay untouched.
- Do not drift into a new concept or redesign the whole site.
- Use the three real screenshots below on the right side as the hero product system:
  - /theme-hero-assets/theme-fuchsia.jpg
  - /theme-hero-assets/theme-dark.jpg
  - /theme-hero-assets/theme-modal.jpg
- The goal is to show three different Duezo themes/states while preserving the same expensive mockup vibe.

What to build
- Create a separate route at app/theme-preview/page.tsx
- It can reuse most of the current homepage structure, but the hero is the focus
- The right side should present the 3 screenshots as a premium grouped composition, not a sloppy collage
- Think: one dominant phone + two supporting phones, or a premium staggered trio, but still readable and believable
- Keep the left-side hero copy close to the current liked version unless a tiny tweak helps the composition
- Preserve Duezo product truth:
  - no bank linking
  - no budgets
  - iPhone only
  - real bill countdown / reminders positioning
  - App Store URL exactly: https://apps.apple.com/us/app/duezo/id6759273131

What not to do
- Do not touch app/page.tsx
- Do not add fake UI cards
- Do not use generic stock-device mockups if a cleaner custom composition works better
- Do not create a busy app-store-style three-phone ad with lots of random chrome
- Do not change pricing/legal/SEO copy in this experiment

Acceptance bar
- The new route should feel like the same hero system Anthony just liked, but with 3 theme variants showcased cleanly
- It should still feel premium, focused, and believable
- It should be obviously a stronger comparison experiment, not a template collage

After editing, summarize exactly what changed and which files were created/edited.
