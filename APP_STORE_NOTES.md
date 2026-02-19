# iOS App Store Submission Notes

## Critical Issue: Next.js + Capacitor Architecture

This app uses **Next.js with API Routes**, which CANNOT be bundled into a static iOS app.

### Current Setup Problems:
1. ✅ Removed dev server config from `capacitor.config.ts` (DONE)
2. ❌ `webDir: 'out'` expects static HTML files (Next.js SSR doesn't generate these)
3. ❌ API routes (`/api/*`) require a Node.js server - can't run in iOS app

### **SOLUTION FOR APP STORE:**

The iOS app **MUST load from a deployed production server** (not bundled files).

#### Option 1: Load from Production URL (RECOMMENDED)
```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'app.duezo',
  appName: 'Duezo',
  webDir: 'public', // Dummy dir, not actually used
  server: {
    url: 'https://duezo.app', // Production deployment
    cleartext: false, // HTTPS only for production
  },
  // ... rest of config
};
```

**Steps:**
1. Deploy Next.js app to production (Vercel, AWS, etc.)
2. Update `capacitor.config.ts` with production URL
3. Build iOS app: `npx cap sync ios`
4. Test thoroughly - app loads from remote server
5. Submit to App Store

#### Option 2: Migrate to Static Export (MAJOR REFACTOR)
This would require:
- Moving all API logic to Supabase Edge Functions
- Converting to `output: 'export'` in Next.js
- Rewriting all `/api/*` routes
- **NOT RECOMMENDED** - too much work

### OAuth URLs That Need Production Updates:

#### Gmail OAuth:
- **Current (Dev):** `http://localhost:3000/api/gmail/callback`
- **Production:** `https://duezo.app/api/gmail/callback`
- **Action Needed:** Update in Google Cloud Console before final build

See `.env.production` for all production environment variables.

### Files Changed:
1. ✅ `capacitor.config.ts` - Removed dev server block
2. ✅ `.env.production` - Created with production URLs
3. ⚠️  **Still TODO:** Set `server.url` to production in capacitor.config.ts

### Next Steps Before App Store Submission:
1. [ ] Deploy Next.js app to production (duezo.app)
2. [ ] Update Google OAuth redirect URI to https://duezo.app/api/gmail/callback
3. [ ] Update capacitor.config.ts with `server: { url: 'https://duezo.app' }`
4. [ ] Test OAuth flow in production iOS build
5. [ ] Run final build and submit
