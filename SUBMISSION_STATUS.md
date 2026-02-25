# App Store Submission Status

**Last updated: 2026-02-25**

---

## 🔴 Current Status: IN REVIEW — Day 5+

**Build 9** was submitted to App Store Connect on approximately Feb 20, 2026 at ~6:11 PM CT.
As of Feb 25, 2026 (Day 5+), the status is still "In Review."

Day 5 is unusually long (Apple average: 24-48h). Possible reasons:
- Manual review triggered (common with email/data-access features)
- Apple waiting for a response from us in App Store Connect (NOT always emailed)
- High review queue volume

### ⚠️ ACTION REQUIRED: Check App Store Connect
Go to https://appstoreconnect.apple.com → Your Apps → Duezo → App Review
Look for: any Apple message, status change, or information request.

---

## ✅ What's Already Done (pre-Build 9)

- [x] Local dev server removed from capacitor.config.ts
- [x] Production URL configured (https://duezo.app)
- [x] Next.js deployed to Vercel → duezo.app live
- [x] Google OAuth redirect updated to https://duezo.app/api/gmail/callback
- [x] All 12 Vercel env vars set
- [x] Stripe env vars live (monthly + yearly price IDs)
- [x] iOS capabilities: Push Notifications, App Groups, Time Sensitive Notifications
- [x] Widget: DuezoWidgetExtension inside main app, reads from App Groups
- [x] APNs: Key KUR4MJD43B active, endpoint integrated
- [x] Build 9: iPhone-only (iPad removed after black screen rejection)
- [x] Splash screen fix (www.duezo.app → avoids redirect black screen)
- [x] Build number bumped (Xcode Cloud was duplicating builds)
- [x] ci_post_clone.sh: cap sync added (public/ and config.xml fix)
- [x] Smart due-soon alerts with pulsing badge + banner

---

## 📋 Post-Approval Launch Checklist

See: `memory/DUEZO-APPROVAL-DAY-WAR-PLAN.md` for full execution plan.

Quick version:
1. Confirm approval in App Store Connect
2. Confirm public App Store URL resolves (no 404)
3. Run parser regression suite
4. App smoke test (sign up, email connect, first bill)
5. Notify Anthony → launch sequence begins
6. Reddit posts (Prism alternative threads)
7. Product Hunt launch (Tuesday 12:01 AM PT optimal)
8. BetaList ping (#149793 already submitted)

---

## Build History

| Build | Submitted | Result |
|-------|-----------|--------|
| 1-7 | Feb 2026 | Various fixes |
| 8 | ~Feb 18 | Rejected — black screen on iPad |
| 9 | ~Feb 20 6:11 PM CT | IN REVIEW (Day 5+) |

---

## Key Files
- War plan: `memory/DUEZO-APPROVAL-DAY-WAR-PLAN.md`
- Launch checklist: `memory/DUEZO-LAUNCH-CHECKLIST-ONE-SCREEN.md`
- App notes: `APP_STORE_NOTES.md`
