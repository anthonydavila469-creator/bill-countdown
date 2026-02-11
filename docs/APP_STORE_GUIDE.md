# Duezo — App Store Submission Guide

> Practical step-by-step for submitting a Capacitor-wrapped Next.js app via Xcode + TestFlight.
> Written for: Mac Mini M4 · Team ID: M7VFSVX62F · Bundle ID: app.duezo

---

## Prerequisites

- [ ] macOS with latest Xcode installed (App Store → Xcode)
- [ ] Apple Developer Program membership active ($99/yr)
- [ ] Xcode Command Line Tools: `xcode-select --install`
- [ ] CocoaPods: `sudo gem install cocoapods` (or `brew install cocoapods`)
- [ ] Node dependencies installed and Capacitor synced:
  ```bash
  cd ~/Projects/bill-countdown
  npm run build        # Build Next.js
  npx cap sync ios     # Sync web assets + native plugins to ios/
  ```

---

## 1. Open the Project in Xcode

```bash
cd ~/Projects/bill-countdown/ios/App
open App.xcworkspace
```

> ⚠️ Always open **`.xcworkspace`**, NOT `.xcodeproj`. The workspace includes CocoaPods dependencies. Opening the wrong one = missing pods = build errors.

---

## 2. Set Up Signing

1. In Xcode, click **App** in the project navigator (blue icon, top-left)
2. Select the **App** target (not the project)
3. Go to **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. **Team**: Select your team — `Anthony Dyess (M7VFSVX62F)`
   - If it doesn't appear: Xcode → Settings → Accounts → Add your Apple ID
6. Xcode will auto-create provisioning profiles and signing certificates

**If you see "No signing certificate":**
- Xcode → Settings → Accounts → Select your team → **Manage Certificates** → Click **+** → **Apple Distribution**

---

## 3. Set the Bundle ID

1. Still on **Signing & Capabilities** for the **App** target
2. Set **Bundle Identifier** to: `app.duezo`
3. If you have a widget extension target, set it to: `app.duezo.widget` (must be a child of the main bundle ID)

> Capacitor sets this in `capacitor.config.ts` (`appId: 'app.duezo'`). Make sure Xcode matches.

---

## 4. Configure Capabilities

Still on **Signing & Capabilities**:

### App Groups
1. Click **+ Capability** → **App Groups**
2. Click **+** under App Groups → add: `group.app.duezo`
3. **Do the same for your widget extension target** — both targets must share the same App Group

### Push Notifications
1. Click **+ Capability** → **Push Notifications**
2. That's it — the APNs key (KUR4MJD43B) is configured server-side, not in Xcode

### Time Sensitive Notifications
1. Click **+ Capability** → **Time Sensitive Notifications**
2. This adds the entitlement automatically

> If any capability shows a red error, Xcode needs to register it with Apple. Click the error — it usually auto-resolves. If not, go to [developer.apple.com/account](https://developer.apple.com/account) → Identifiers → edit your App ID and enable the capability manually.

---

## 5. Build for a Real Device (Testing)

1. Connect your iPhone via USB (or use wireless debugging if previously paired)
2. At the top of Xcode, select your device from the destination picker (not "Any iOS Device")
3. Hit **⌘B** to build, or **⌘R** to build & run
4. First time: your iPhone will prompt you to trust the developer certificate
   - iPhone → Settings → General → VPN & Device Management → Trust your certificate

**Capacitor live reload (optional for dev):**
```bash
npx cap run ios --livereload --external
```

---

## 6. Archive and Upload to App Store Connect

This is the big one. Archiving creates a release build that you upload to Apple.

### 6a. Prepare

1. Set the **version** and **build number**:
   - Select the **App** target → **General** tab
   - **Version**: `1.0.0` (marketing version, shown to users)
   - **Build**: `1` (increment this every upload — Apple rejects duplicate build numbers)
2. Select destination: **Any iOS Device (arm64)** at the top (NOT a specific device or simulator)

### 6b. Archive

1. **Product → Archive** (⌘⇧B won't work — must use menu)
2. Wait 2-5 minutes. Xcode compiles a release build.
3. When done, the **Organizer** window opens showing your archive.

> If "Archive" is grayed out: you have a simulator selected as destination. Switch to "Any iOS Device (arm64)".

### 6c. Upload

1. In the Organizer, select your archive → click **Distribute App**
2. Choose **App Store Connect** → **Upload**
3. Distribution options — leave defaults:
   - ✅ Upload your app's symbols
   - ✅ Manage version and build number
4. Signing: **Automatically manage signing** (recommended)
5. Click **Upload**
6. Wait 5-10 minutes for upload + Apple's server-side processing

### 6d. Verify Upload

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps → Duezo → TestFlight tab
3. Your build should appear within 15-30 minutes (Apple runs automated checks)
4. You may get an email about "Missing Compliance" — see gotchas below

---

## 7. Set Up TestFlight (Internal Testing)

1. In App Store Connect → your app → **TestFlight** tab
2. **Internal Testing**:
   - Click **+** next to "Internal Testing" to create a group
   - Name it (e.g., "Core Team")
   - Add testers by Apple ID email (up to 100 internal testers)
   - Internal testers must be App Store Connect users on your team
3. Select the build → **Enable** it for the group
4. **Export Compliance**: When prompted, answer:
   - "Does your app use encryption?" → **Yes** (HTTPS counts)
   - "Is it exempt?" → **Yes** (standard HTTPS/TLS is exempt under exemption categories)
   - This clears the "Missing Compliance" warning
5. Testers get an email/push → install via the **TestFlight app** on their iPhones

**External Testing** (up to 10,000 testers):
- Requires Apple review (~24-48h)
- Create an external group, add emails or share a public link

---

## 8. App Store Connect — Full Submission

When ready to submit for App Store review:

### 8a. Create the App (if not done)

1. App Store Connect → My Apps → **+** → New App
2. Fill in:
   - **Platform**: iOS
   - **Name**: Duezo
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: app.duezo
   - **SKU**: `duezo` (internal reference, anything unique)

### 8b. App Information

| Field | Value |
|---|---|
| **Name** | Duezo |
| **Subtitle** | Bill Reminders & Countdowns |
| **Category** | Finance (primary), Utilities (secondary) |
| **Content Rights** | "Does not contain third-party content" |
| **Age Rating** | Fill out the questionnaire (likely 4+) |

### 8c. Pricing & Availability

- **Price**: Free (or choose a tier)
- **Availability**: All territories (or select specific ones)

### 8d. App Privacy

- Go to **App Privacy** tab
- Declare what data you collect (even if it's just analytics)
- Common for Duezo: "Data Not Collected" if no tracking, OR declare push notification tokens, usage data, etc.

### 8e. Prepare for Submission (Version Page)

**Screenshots** (required):
- 6.7" (iPhone 15 Pro Max): 1290 × 2796 px — **required**
- 6.5" (iPhone 14 Plus): 1284 × 2778 px — **required**
- 5.5" (iPhone 8 Plus): 1242 × 2208 px — optional but recommended
- iPad Pro 12.9" (if universal): 2048 × 2732 px

> **Tip**: Use the Simulator to take screenshots at exact sizes: `⌘S` in Simulator saves to Desktop. Or use [screenshots.pro](https://screenshots.pro) / Figma templates for polished frames.

**App description fields:**
- **Promotional Text**: (can change anytime, no review needed) — "Never miss a bill. Duezo counts down to every due date."
- **Description**: Explain what the app does, features, why users want it
- **Keywords**: `bills,reminders,due dates,countdown,payments,finance,budget` (100 char limit, comma-separated)
- **Support URL**: Your website or GitHub page
- **Marketing URL**: Optional

**What's New**: "Initial release" (for v1.0)

**Build**: Click **+** next to Build and select your uploaded build

**App Review Information**:
- Contact info (name, phone, email)
- Notes for reviewer: explain anything non-obvious ("This app sends push notifications for bill reminders. No login required.")
- Demo account: provide one if login is required

### 8f. Submit

1. Click **Add for Review**
2. Click **Submit to App Review**
3. Wait 24-48 hours (sometimes faster, sometimes up to a week)
4. You'll get an email: Approved ✅ or Rejected with specific feedback

---

## 9. Common Gotchas & Errors

### Build Errors

| Error | Fix |
|---|---|
| `No signing certificate` | Xcode → Settings → Accounts → Manage Certificates → + Apple Distribution |
| `Provisioning profile doesn't include capability` | Toggle the capability off and on, or manually add it at developer.apple.com |
| `Archive grayed out` | Select "Any iOS Device (arm64)" as build destination |
| `Pod not found` / `module not found` | Run `cd ios/App && pod install --repo-update` |
| `duplicate symbol` / linker errors | `cd ios/App && pod deintegrate && pod install` |

### Upload Errors

| Error | Fix |
|---|---|
| `ERROR ITMS-90717: Invalid App Store Icon` | App icon must be 1024×1024 PNG, **no alpha channel** (no transparency). Check `Assets.xcassets` |
| `ITMS-90032: Invalid Image Path` | Missing icon sizes. Use an icon generator: [appicon.co](https://appicon.co) |
| `Invalid Bundle - Disallowed nested bundles` | Frameworks issue. Clean build folder (⌘⇧K), archive again |
| `Missing Compliance` | Not an error — answer the export compliance question in TestFlight |
| Duplicate build number | Increment **Build** number in General tab before re-archiving |

### Rejection Reasons (Common)

- **Guideline 4.0 - Design**: App looks like a web wrapper. Fix: make sure native features work (push notifications, haptics). Add a splash screen, proper app icon.
- **Guideline 2.1 - Performance**: App crashed during review. Test on a real device, not just simulator.
- **Guideline 5.1.1 - Privacy**: Missing privacy policy URL or data disclosure. Add a privacy policy link.
- **Guideline 2.3.3 - Screenshots**: Screenshots don't match app functionality. Use real screenshots.
- **Missing purpose string**: If you use camera/location/etc, add usage descriptions in `Info.plist`.

### Capacitor-Specific Gotchas

- **Always `npx cap sync ios` before archiving** — otherwise you ship stale web assets
- **`capacitor.config.ts` vs Xcode**: Bundle ID and app name should match in both places
- **WKWebView quirks**: Test on real devices. Simulator doesn't always match WebKit behavior.
- **Large bundle?** Next.js output can be big. Run `npm run build` with production optimizations. Consider `output: 'export'` in `next.config.js` for static export.
- **Deep links / Universal Links**: Need Associated Domains capability + `apple-app-site-association` file on your server

### Useful Commands

```bash
# Full rebuild cycle
cd ~/Projects/bill-countdown
npm run build
npx cap sync ios
cd ios/App
pod install
open App.xcworkspace
# Then Archive in Xcode

# Clean everything
cd ios/App
rm -rf Pods Podfile.lock
pod install
# In Xcode: Product → Clean Build Folder (⌘⇧K)

# Check what Capacitor synced
ls ios/App/App/public/  # Your web assets land here
```

---

## Quick Reference: The Submission Flow

```
npm run build
    ↓
npx cap sync ios
    ↓
Open .xcworkspace in Xcode
    ↓
Set version + build number
    ↓
Product → Archive
    ↓
Distribute App → App Store Connect → Upload
    ↓
App Store Connect → TestFlight → Enable build → Test
    ↓
App Store Connect → Prepare for Submission → Fill everything → Submit
    ↓
Wait for review (24-48h)
    ↓
🎉 App Store
```

---

*Last updated: February 2026*
