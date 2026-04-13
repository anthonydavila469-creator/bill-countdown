# Claude Code Revision — Replace stylized Duezo product moments with real assets

## Goal
Revise the isolated `app/claude-preview/page.tsx` route so the product-proof sections use Anthony's real Duezo assets instead of the current stylized/fake scan + widget treatments.

## Hard Constraints
- DO NOT edit `app/page.tsx`
- DO NOT edit `app/gemini-preview/page.tsx`
- ONLY revise `app/claude-preview/page.tsx` (and create preview-only helpers only if absolutely needed)
- Do not deploy anything
- Keep the existing overall structure and page quality intact

## Why this revision is needed
The current Claude preview is materially better than Gemini, but the scan/widget sections still rely on stylized/fabricated support visuals.
Anthony sent real product assets and wants those used instead.

## Real assets to use
1. Real bill scan screen:
- `public/claude-preview-assets/real-bill-scan.jpg`

What it is:
- actual Duezo "Scan a Bill" screen
- dark modal/sheet UI
- header: "Scan a Bill"
- green confidence bar: "High confidence"
- real extracted fields (Capital One Savor, amount, due date, etc.)
- this should replace the current fake/stylized extraction card section

2. Widget candidate asset:
- `public/claude-preview-assets/real-widget-candidate.jpg`

Use this as the widget/product-proof visual if it reads well in composition.
It appears to be a real Duezo upcoming-bills card/widget-style asset on black.
If needed, crop or frame it tastefully, but do not redraw it as fake UI.

## Required changes
1. Replace the current stylized AI Photo Scan visual with the real bill scan image
   - keep the section copy strong
   - but the visual itself should be the real screenshot in a tasteful frame/presentation
   - make it feel premium and believable

2. Replace or materially revise the current reminders/widgets visual block to use the real widget candidate asset
   - again: real asset first, not fake UI invention
   - if the current notification treatment still helps, it can remain lightly, but the main proof should come from the real asset

3. Keep the page visually polished
   - do not just drop raw screenshots awkwardly
   - frame/crop/present them so they feel intentional
   - keep dark premium Duezo aesthetic

4. Preserve product truth
   - Free = up to 5 bills, countdown timers, basic reminders, Quick Add, default Purple theme
   - Pro includes AI Photo Scan, custom reminder timing, all themes, widgets, calendar view and payment history
   - No Gmail/email import/lifetime/export/Android drift

## Additional guidance
- The hero can stay largely as-is
- Focus on upgrading the product proof sections with these real assets
- If one of the current section layouts needs to be simplified so the real screenshot can shine, do that
- Prefer believable restraint over extra decoration

## Output
When finished:
- print concise summary of what changed
- mention only files touched