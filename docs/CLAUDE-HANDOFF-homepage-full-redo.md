# Duezo Homepage Full Redo Handoff

Project: ~/Projects/bill-countdown
Primary file: app/page.tsx

This is no longer a tweak pass. Redo the homepage visual system.

Anthony's feedback is the spec:
- current homepage UI is not acceptable
- phone mockup is wrong now
- dead space is bad
- spacing is bad
- FAQ/lower section alignment feels off
- page drifted from the stronger visual direction he expected
- do NOT assume the current layout should be preserved

What you are allowed to do:
- fully redesign `app/page.tsx`
- you may restructure sections within the homepage if needed
- keep the current homepage content architecture broadly useful (hero / problem / how it works / why duezo / trust / pricing / FAQ / CTA) only if it still produces a premium result
- you may recompose the hero completely

What you must preserve:
1. Product truth
- no Gmail/email-import positioning
- no sign in or signup public paths on homepage
- App Store URL must be exactly: https://apps.apple.com/us/app/duezo/id6759273131
- pricing truth:
  - free tier exists
  - $3.99/month
  - $19.99/year
  - 7-day free trial on yearly
- no payment-history/export marketing claims
- founder quote wording should stay unless absolutely necessary for layout

2. Brand direction
- premium dark iPhone-first feel
- Duezo D logo only in homepage branding treatment
- no cheesy fake UI gimmicks
- if using a phone/device, it must look excellent
- if not excellent, use premium product staging rather than a fake phone shell

3. Constraints
- do not touch privacy/terms/blog/etc in this pass
- do not deploy
- minimize changes outside app/page.tsx

Design target:
- premium, intentional, high-conviction
- less empty dead space
- stronger composition
- stronger product presence
- no awkward FAQ alignment
- no generic evenly padded blocks
- should feel more like a polished product launch page and less like a generic SaaS template

Helpful reference:
- commit 03e62ef had a stronger overall hero/composition energy, but bad product truth. Use it as composition inspiration only.

Output requirement:
After editing, report:
- what you changed in the hero
- what you changed in the product staging
- what you changed in the spacing system
- what you changed in FAQ/final CTA
- remaining visual risks
