# RevenueCat IAP Setup Guide

## Overview

Duezo uses RevenueCat to manage iOS In-App Purchases via StoreKit 2. Web billing still goes through Stripe. This guide covers everything needed to configure and test IAP.

## Pricing

| Plan | Price | Product ID | Notes |
|------|-------|------------|-------|
| Monthly | $3.99/mo | `app.duezo.pro.monthly` | No trial |
| Annual | $19.99/yr | `app.duezo.pro.yearly` | 7-day free trial |

## 1. App Store Connect Setup

### Create Subscription Group
1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Duezo → Subscriptions
2. Create a subscription group called **"Duezo Pro"**
3. Add two subscriptions:

**Monthly:**
- Reference Name: `Duezo Pro Monthly`
- Product ID: `app.duezo.pro.monthly`
- Price: $3.99 (Tier)
- Duration: 1 Month
- No free trial

**Annual:**
- Reference Name: `Duezo Pro Annual`
- Product ID: `app.duezo.pro.yearly`
- Price: $19.99 (Tier)
- Duration: 1 Year
- Free trial: 7 days (set in Subscription Offers)

### Localization
Add display names and descriptions for each subscription in English (US):
- Monthly: "Duezo Pro - Monthly" / "Unlimited bills, reminders, widgets, and more"
- Annual: "Duezo Pro - Annual" / "Unlimited bills, reminders, widgets, and more. 7-day free trial."

## 2. RevenueCat Dashboard Setup

### Create Project
1. Sign up at [app.revenuecat.com](https://app.revenuecat.com)
2. Create a new project: **"Duezo"**

### Add iOS App
1. In the project, add a new app → Apple App Store
2. Enter Bundle ID: `app.duezo`
3. Add your App Store Connect Shared Secret:
   - App Store Connect → Duezo → App Information → App-Specific Shared Secret
4. Add the Apple Server-to-Server notification URL (RevenueCat provides this)

### Create Entitlement
1. Go to Entitlements → Create New
2. Identifier: `pro`
3. Attach both products (`app.duezo.pro.monthly` and `app.duezo.pro.yearly`)

### Create Offering
1. Go to Offerings → Create New
2. Identifier: `default`
3. Add two packages:
   - `$rc_monthly` → `app.duezo.pro.monthly`
   - `$rc_annual` → `app.duezo.pro.yearly`
4. Set as **Current Offering**

### Configure Webhook
1. Go to Integrations → Webhooks
2. Add webhook URL: `https://duezo.app/api/revenucat/webhook`
3. Set Authorization header: `Bearer YOUR_WEBHOOK_SECRET`
4. Enable events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE

### Get API Key
1. Go to API Keys
2. Copy the **iOS public API key** (starts with `appl_`)
3. This goes in `NEXT_PUBLIC_REVENUCAT_API_KEY`

## 3. Environment Variables

Add these to your `.env.local` and Vercel environment:

```env
# RevenueCat
NEXT_PUBLIC_REVENUCAT_API_KEY=appl_your_key_here
REVENUCAT_WEBHOOK_SECRET=your_webhook_secret_here
```

The `NEXT_PUBLIC_` prefix makes the API key available client-side (required for SDK initialization on iOS).

## 4. Supabase Migration

Run the migration to add RevenueCat fields to user_preferences:

```bash
supabase db push
# or apply manually:
# supabase migration up 028_revenucat_subscription_fields
```

This adds:
- `subscription_tier` (text, default 'free') — 'free' or 'pro'
- `revenucat_customer_id` (text, nullable) — maps to RevenueCat user
- `subscription_expires_at` (timestamptz, nullable) — when current period ends

## 5. Testing with Sandbox

### Setup Sandbox Tester
1. App Store Connect → Users and Access → Sandbox → Testers
2. Add a sandbox test account (use a unique email, not your real one)
3. On your test iPhone: Settings → App Store → Sandbox Account → sign in with sandbox tester

### Sandbox Purchase Flow
1. Build and run the app on a real device (simulator doesn't support StoreKit)
2. Create a bill to trigger the paywall
3. Select a plan and tap Subscribe/Start Free Trial
4. Authenticate with your sandbox account
5. Sandbox subscriptions auto-renew at accelerated rates:
   - Monthly → renews every 5 minutes
   - Annual → renews every 1 hour
   - Free trial (7 days) → expires in 3 minutes

### Verify in RevenueCat
- Check the RevenueCat dashboard → Customers to see the test purchase
- Verify the webhook fires and updates Supabase

### Verify in Supabase
```sql
SELECT user_id, subscription_tier, subscription_status, subscription_expires_at, revenucat_customer_id
FROM user_preferences
WHERE subscription_tier = 'pro';
```

## 6. Architecture Notes

### Flow: iOS Purchase
```
User taps Subscribe
  → Paywall component calls useStoreKit().purchase()
  → RevenueCat SDK (purchases-capacitor) handles StoreKit 2 transaction
  → Apple processes payment
  → RevenueCat receives receipt
  → RevenueCat sends webhook to /api/revenucat/webhook
  → Webhook updates Supabase (subscription_tier='pro')
  → Client refreshes subscription context
  → UI updates to show Pro features
```

### Flow: Web (Stripe - unchanged)
```
Web users still go through Stripe checkout
  → /api/stripe/checkout creates session
  → Stripe processes payment
  → Stripe webhook updates Supabase
```

### Key Files
| File | Purpose |
|------|---------|
| `lib/storekit.ts` | RevenueCat SDK wrapper (initialize, purchase, restore) |
| `hooks/use-storekit.ts` | React hook for StoreKit operations |
| `contexts/subscription-context.tsx` | Central subscription state (fetches from Supabase + RevenueCat) |
| `components/paywall.tsx` | Purchase UI with plan selection |
| `components/upgrade-modal.tsx` | Wrapper that connects paywall to subscription context |
| `components/pro-feature-gate.tsx` | Locks features behind Pro tier |
| `app/api/revenucat/webhook/route.ts` | Server-side webhook handler |
| `supabase/migrations/028_*.sql` | Database schema for subscription fields |

## 7. Going Live Checklist

- [ ] Products created in App Store Connect with correct IDs
- [ ] RevenueCat project configured with entitlement + offering
- [ ] Webhook URL set in RevenueCat dashboard
- [ ] Environment variables set in Vercel
- [ ] Supabase migration applied to production
- [ ] Sandbox purchases tested end-to-end
- [ ] Restore purchases works correctly
- [ ] Free tier limits enforced (5 bills, 1 reminder)
- [ ] Paywall triggers after first bill (not on cold open)
- [ ] App Store review submission includes subscription metadata
