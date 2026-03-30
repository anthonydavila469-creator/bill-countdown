# Duezo PRD v2 — Complete Rebuild Specification
**Date:** 2026-03-24
**Author:** Noemi (COO) + Anthony Dyess (CEO)
**Status:** DRAFT — Awaiting Anthony's approval before rebuild begins

---

## 1. Product Overview

**Name:** Duezo
**Tagline:** "Never Miss a Bill Payment Again"
**What it is:** A bill tracking iOS app that scans Gmail/Yahoo/Outlook emails, extracts bills via AI, and shows beautiful countdown cards. No bank linking. Manual-first, email-powered.
**Bundle ID:** app.duezo
**Domain:** duezo.app

---

## 2. Architecture (THE FIX — No More WebView Hacks)

### Current (Broken)
- Next.js web app loaded inside Capacitor WKWebView
- Remote URL (duezo.app) served in native shell → cookie/auth/CORS nightmares
- Static export bundled locally → cross-origin API calls break

### New Architecture (Clean Rebuild)
**Option A: Native SwiftUI + API Backend**
- Pure SwiftUI iOS app (no Capacitor, no WKWebView, no web bundling)
- Next.js stays as the marketing website + API backend on Vercel
- iOS app talks to API via REST with Bearer token auth
- Widget is already native Swift — stays as-is

**Option B: Capacitor Done Right**
- Static Next.js bundled locally (current `output: 'export'`)
- ALL API calls use Bearer token auth (already implemented in Build 27+)
- No remote URL loading, no cookie passing
- Capacitor plugins for native features (push, haptics, app links)

**✅ DECISION MADE (2026-03-24): SwiftUI native rebuild. No more Capacitor/WebView.**

### API Authentication
- Supabase auth → JWT access token stored on device
- Every API call: `Authorization: Bearer <token>` header
- Server validates via `getAuthenticatedUser()` middleware
- RLS enabled on ALL Supabase tables (deployed 2026-03-24)

---

## 3. Screens & Navigation

### Bottom Navigation Bar (5 tabs)
| Tab | Icon | Screen |
|-----|------|--------|
| Home | 🏠 | Dashboard (bill cards) |
| Calendar | 📅 | Calendar view |
| ➕ | Plus button | Add bill (modal) |
| History | 📊 | Payment history |
| Settings | ⚙️ | Settings |

### 3.1 Onboarding / Welcome Screen
- Shows on first launch (before any account exists)
- App name, logo, tagline
- "Get Started" → Sign Up
- "Already have an account?" → Login
- **Must display for at least 2 seconds** (currently flashes and auto-redirects)

### 3.2 Login Screen
- Sign in with Apple (primary)
- Sign in with Google
- Email + Password
- "Forgot Password?" link
- "Don't have an account? Sign up" link

### 3.3 Sign Up Screen
- Sign up with Apple
- Sign up with Google
- Email + Password + Confirm Password
- "Already have an account? Login" link

### 3.4 Forgot Password Screen
- Email input
- "Send Reset Link" button
- Supabase magic link flow

### 3.5 Dashboard (Home)
**Header:**
- "Duezo" logo/text top-left
- Notification bell top-right (shows unread count badge)
- Search icon

**Stats Bar (optional, togglable):**
- Total due this month
- Bills paid / total
- Next due bill countdown

**Bill Cards (main content):**
- Grid view (default, 3 per row) or List view (togglable)
- Each card shows:
  - Bill name
  - Amount (or "—" if unknown)
  - Days until due (large countdown number)
  - Category emoji/icon
  - Urgency color coding (overdue=red, urgent=orange, soon=yellow, safe=green, distant=blue)
  - Autopay badge if applicable
  - Price change indicator (↑↓) if amount changed from last period
- **Swipe right to mark paid** (haptic feedback on threshold)
- **Tap card → Bill Detail Modal**
- **Sort options:** Due date, Amount, Name
- **Filter options:** All, Overdue, Upcoming, Paid

**Floating Action Buttons:**
- ➕ Add Bill (opens Add Bill Modal)
- 📷 Scan Bill (opens camera for screenshot detection)

**Empty State:**
- Friendly illustration
- "No bills yet — add your first bill or connect your email"
- Quick action buttons: Add Bill, Connect Email

### 3.6 Add Bill Modal
**Two entry methods:**

**Method 1: Manual Add**
- Bill name (text input, required)
- Amount (number input, optional — some bills vary)
- Due date (date picker, required)
- Category (dropdown: utilities, subscription, rent, housing, insurance, phone, internet, credit card, loan, health, other)
- Emoji picker (auto-suggests based on category)
- Recurring toggle → if on:
  - Interval: weekly, biweekly, monthly, yearly
  - Day of month (for monthly)
- Autopay toggle
- Payment URL (optional)
- "Save" button

**Method 2: Screenshot/Camera Scan**
- Opens device camera OR photo picker
- User photographs a bill/statement/notification
- AI (Claude) extracts: name, amount, due date, category
- Pre-fills the manual form with extracted data
- User confirms/edits → Save
- API: POST /api/bills/scan (sends image, returns parsed bill data)

### 3.7 Bill Detail Modal
- Full bill info (name, amount, due date, category, source)
- Payment URL link ("Pay Now" → opens in external browser)
- Mark as Paid button (with amount input + date)
- Edit button → opens edit form
- Delete button (with confirmation)
- Payment history for this bill (past payments)
- Recurring info if applicable
- Source badge (Manual, Gmail, Yahoo, Outlook)

### 3.8 Calendar View
- Monthly calendar grid
- Due dates marked with colored dots (urgency colors)
- Tap a day → shows bills due that day
- Month navigation (prev/next)
- Today highlighted

### 3.9 History Tab
- **Summary stats at top:**
  - Total paid this month
  - Total paid all-time
  - Average monthly spend
- **Category breakdown** (pie chart or bar)
- **Payment list** (chronological, most recent first)
  - Bill name, amount paid, date paid, method (manual/autopay)
- Filter by: month, category

### 3.10 Settings Screen
**Account Section:**
- Profile info (email, display name)
- Sign out button
- Delete account (with confirmation)

**Email Connections:**
- Gmail: Connect/Disconnect (OAuth → SFSafariViewController)
- Yahoo: Connect/Disconnect (IMAP app password — NOT OAuth)
- Outlook: Connect/Disconnect (OAuth → SFSafariViewController)
- Status indicator for each (connected/disconnected, last sync time)

**Notifications:**
- Email reminders toggle
- Push notifications toggle
- Reminder timing: 1 day before, 3 days before, 7 days before (multi-select)
- Timezone selector

**Appearance:**
- Color theme picker (9 themes — see §5)
- Card size: Default / Compact
- Dashboard view: Grid / List
- Cards per row: 2 / 3 / 4
- Show stats bar toggle
- Number color mode: White / Urgency / Gradient

**Subscription:**
- Current plan (Free / Pro)
- Upgrade button → Paywall
- Manage subscription link

**About:**
- App version
- Terms of Service link
- Privacy Policy link

### 3.11 Paywall / Upgrade Screen
- Feature comparison (Free vs Pro)
- Monthly: $3.99/mo
- Yearly: $19.99/yr (save 58%)
- RevenueCat StoreKit 2 integration
- Restore Purchases button

---

## 4. Data Model

### Bills Table
```
id: uuid (PK)
user_id: uuid (FK → auth.users)
name: text
amount: numeric (nullable — some bills vary)
due_date: date (YYYY-MM-DD)
emoji: text
category: bill_category enum
is_paid: boolean
paid_at: timestamptz
paid_method: paid_method enum (manual | autopay)
last_paid_amount: numeric
is_recurring: boolean
recurrence_interval: recurrence_interval enum (weekly | biweekly | monthly | yearly)
recurrence_day_of_month: int
recurrence_weekday: int (0-6)
next_due_date: date
parent_bill_id: uuid (FK → bills.id, self-reference)
generated_next: boolean
source: bill_source enum (manual | gmail | yahoo | outlook)
gmail_message_id: text
account_last4: text
review_reason: text
payment_url: text
is_autopay: boolean
previous_amount: numeric
icon_key: bill_icon_key enum
created_at: timestamptz
updated_at: timestamptz
```

### User Preferences Table
```
id: uuid (PK)
user_id: uuid (FK)
is_pro: boolean
color_theme: color_theme_id enum (default: amethyst)
dashboard_layout: jsonb
email_provider: text
email_connected: boolean
gmail_connected: boolean
gmail_access_token: text (encrypted)
gmail_refresh_token: text (encrypted)
gmail_token_expires_at: timestamptz
stripe_customer_id: text
stripe_subscription_id: text
subscription_status: subscription_status enum
subscription_plan: text
subscription_current_period_end: timestamptz
subscription_cancel_at_period_end: boolean
gmail_syncs_used: int
trial_ends_at: timestamptz
subscription_tier: subscription_tier enum (free | pro)
revenucat_customer_id: text
subscription_expires_at: timestamptz
created_at: timestamptz
updated_at: timestamptz
```

### APNs Tokens Table
```
id: uuid (PK)
user_id: uuid (FK)
token: text (unique)
device_name: text
is_active: boolean
last_verified_at: timestamptz
created_at: timestamptz
```

### Other Tables
- `emails_raw` — stored email content for processing
- `bill_extractions` — AI extraction results with confidence scores
- `notification_settings` — per-user notification preferences
- `sent_reminders` — email reminder delivery log
- `sent_push_reminders` — push notification delivery log
- `auth_transfers` — OAuth session transfer tokens (for native ↔ web auth)
- `vendor_templates` — hybrid parser vendor recognition (20 seeds)
- `extraction_templates` — 43 bill pattern templates
- `learning_events` — parser self-improvement tracking
- `drift_metrics` — extraction accuracy monitoring
- `user_inboxes` — multi-provider email connections

---

## 5. Design System

### Brand Colors
| Name | Hex | Usage |
|------|-----|-------|
| Background | #0F0A1E | App background |
| Primary Purple | #8B5CF6 | Brand accent |
| Light Purple | #A78BFA | Secondary accent |
| White | #FFFFFF | Primary text |
| Muted | #A1A1AA | Secondary text |

### Logo
- **New purple "D" icon** (italic/forward-leaning white D on #7C3AED purple)
- Square format, no rounded corners (iOS adds those)

### Urgency Colors (UNIVERSAL — never change per theme)
| Level | Hex | Condition |
|-------|-----|-----------|
| Overdue | #ef4444 (red) | Past due |
| Urgent | #f97316 (orange) | 1-3 days |
| Soon | #eab308 (yellow) | 4-7 days |
| Safe | #22c55e (green) | 8-14 days |
| Distant | #3b82f6 (blue) | 15+ days |

### Color Themes (9 options)
**Vibrant (white numbers on cards):**
1. Pink (Ember) — #f472b6 → #a78bfa
2. Sky (Cosmic) — #60a5fa → #a78bfa
3. Emerald — #10b981 → #2dd4bf

**Dark (gradient numbers on cards):**
4. Midnight — #1e3a5f → #3730a3
5. Wine — #4a1942 → #831843
6. Onyx — #0a0a0a → #1c1c1c
7. Amethyst (default) — #2d1b4e → #581c87
8. Ocean — #134e4a → #0d9488
9. Sunset — #451a03 → #92400e

### Typography
- **Primary:** System font (SF Pro on iOS, system-ui on web)
- **Monospace:** SF Mono / system monospace

---

## 6. Native iOS Features

### Widget (WidgetKit — KEEP AS-IS)
- **Small widget:** Single bill countdown (next due)
- **Medium widget:** 3-bill list with countdowns
- App Group: `group.app.duezo` for data sharing
- Reads from UserDefaults via App Group (JSON payload synced from app)
- Files: `ios/DuezoWidgetExtension/` (DuezoWidget.swift, SmallCountdownWidgetView.swift, MediumBillsWidgetView.swift, DuezoTheme.swift, Urgency.swift, WidgetSurface.swift)

### Push Notifications (APNs)
- Device token registration on app launch
- Server-side: APNs HTTP/2 via jose JWT signing
- Daily cron at 8:15 AM UTC: sends "bill due soon" reminders
- Key: KUR4MJD43B, Team: M7VFSVX62F

### Haptics
- Light haptic on card tap
- Success haptic on swipe-to-pay
- Notify haptic on errors

### Deep Links
- URL scheme: `app.duezo://`
- Used for OAuth callback return (SFSafariViewController → native app)
- AASA file live for Universal Links prep

---

## 7. Email Integration

### Gmail (OAuth 2.0)
- Scopes: `gmail.readonly`
- Published to production (any Google user)
- Flow: Settings → Connect Gmail → SFSafariViewController → Google consent → callback → token stored
- Sync: Fetches last 200 emails / 90 days → hybrid parser extracts bills

### Yahoo (IMAP App Password — NOT OAuth)
- Yahoo rejected our OAuth app
- Flow: Settings → Connect Yahoo → User enters IMAP app password (16-char from Yahoo settings) → validates via IMAP LOGIN
- No refresh token issues, works indefinitely

### Outlook (OAuth 2.0 — Microsoft Graph)
- Client ID: d302d161-57f7-4a49-8d87-edd8dcaa853b
- Scopes: Mail.Read
- Same SFSafariViewController flow as Gmail

### Bill Extraction Pipeline
1. **Classification** — Is this email a bill?
2. **Vendor Resolution** — Match to known vendor (20 seeds)
3. **Template Matching** — Try 43 deterministic templates
4. **Confidence Gating** — If confidence < threshold → AI fallback
5. **AI Fallback** — Claude extracts name/amount/due date/category
6. **Post-processing** — Dedup, recurring detection, category assignment

---

## 8. Subscription System (RevenueCat)

- **Free tier:** Unlimited manual bills, 1 email provider, basic themes
- **Pro tier:** Multiple email providers, all themes, priority support, advanced analytics
- **Pricing:** $3.99/mo OR $19.99/yr
- **StoreKit 2** via RevenueCat SDK
- **Webhook:** /api/revenucat/webhook handles all subscription events
- **Project ID:** 7cf7bacf
- **API Key:** appl_LzmHBXVFoNnTrqksjrBUaCDdrcH

---

## 9. Cron Jobs (Vercel)

| Cron | Schedule | Purpose |
|------|----------|---------|
| send-bill-reminders | 8:00 AM UTC daily | Email reminders via Resend |
| send-push-reminders | 8:15 AM UTC daily | APNs push notifications |
| auto-sync-bills | Daily | Re-sync connected email providers |
| drift-detection | Weekly | Monitor parser accuracy |
| learning-pass | Weekly | Promote high-confidence templates |

---

## 10. API Routes

### Auth
- POST /api/auth/transfer — OAuth session transfer (native ↔ web)

### Bills
- GET /api/bills — List user's bills
- POST /api/bills — Create bill
- GET /api/bills/[id] — Get single bill
- PATCH /api/bills/[id] — Update bill
- DELETE /api/bills/[id] — Delete bill
- POST /api/bills/[id]/pay — Mark bill as paid
- POST /api/bills/scan — AI scan bill from screenshot
- POST /api/bills/import — Bulk import bills
- POST /api/bills/clear-all — Delete all bills (dangerous)

### Email
- GET /api/gmail/connect — Start Gmail OAuth
- GET /api/gmail/callback — Gmail OAuth callback
- POST /api/gmail/disconnect — Disconnect Gmail
- POST /api/gmail/sync — Trigger manual sync
- GET /api/email/connect — Start Yahoo/Outlook OAuth
- GET /api/email/callback — Yahoo/Outlook OAuth callback
- POST /api/email/connect-password — Yahoo IMAP app password
- POST /api/email/disconnect — Disconnect provider

### Notifications
- GET /api/notifications/settings — Get notification prefs
- PATCH /api/notifications/settings — Update notification prefs
- POST /api/devices/register-apns-token — Register push token
- GET /api/notifications/feed — Get in-app notification feed

### Account
- DELETE /api/account/delete — Delete account + all data
- GET /api/preferences — Get user preferences
- PATCH /api/preferences — Update user preferences

### Subscription
- POST /api/revenucat/webhook — RevenueCat events
- GET /api/stripe/status — Check subscription status
- POST /api/stripe/checkout — Create Stripe checkout
- POST /api/stripe/portal — Open Stripe customer portal

### Admin
- GET /api/admin/stats — Dashboard stats (admin only)

---

## 11. Marketing Website (duezo.app — Separate from App)

**Keep as Next.js on Vercel. NOT bundled into the app.**

Pages:
- Landing page (/)
- Login/Signup (/login, /signup)
- Blog (5 SEO articles)
- Comparison pages (/vs/prism, /vs/ynab, /vs/mint, etc.)
- Alternative pages (/prism-alternative, /mint-alternative, /finovera-alternative)
- Legal (/privacy, /terms)
- Forgot password (/forgot-password, /reset-password)

---

## 12. What MUST Work on Day 1 of Rebuild

1. ✅ Sign up (Apple, Google, Email)
2. ✅ Login (Apple, Google, Email)
3. ✅ Forgot password
4. ✅ Add bill manually (all fields)
5. ✅ Add bill via screenshot/camera
6. ✅ View bills on dashboard (grid + list)
7. ✅ Bill countdown cards with urgency colors
8. ✅ Swipe to mark paid
9. ✅ Bill detail modal (view, edit, delete, pay)
10. ✅ Calendar view
11. ✅ History tab with stats
12. ✅ Settings (all sections)
13. ✅ Connect Gmail (OAuth via SFSafariViewController)
14. ✅ Connect Yahoo (IMAP app password)
15. ✅ Connect Outlook (OAuth)
16. ✅ Email sync → bill extraction
17. ✅ Push notifications (APNs)
18. ✅ Widget (small + medium)
19. ✅ 9 color themes
20. ✅ RevenueCat subscription
21. ✅ Deep link return from OAuth
22. ✅ New purple "D" logo everywhere

---

## 13. What We're NOT Doing (Scope Control)

- ❌ Android (later)
- ❌ Bank linking (never — that's our differentiator)
- ❌ Budgeting features (we're not YNAB)
- ❌ Bill pay through the app (we link to payment URLs)
- ❌ Social features
- ❌ Desktop app

---

## 14. Open Questions for Anthony

1. **Architecture: SwiftUI native (A) or Capacitor done right (B)?**
   - A = cleaner, faster, no WebView at all, but full rewrite in Swift
   - B = keep React/Next.js codebase, fix the auth/bundling properly
2. **Any features you want to ADD that aren't in the current app?**
3. **Any features you want to REMOVE?**
4. **Timeline expectation?** (A = 2-3 weeks, B = 3-5 days)

---

*This PRD is the source of truth. Nothing gets built that isn't in here. Nothing in here gets skipped.*
