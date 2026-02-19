# Duezo Widget — Xcode Setup Guide

## Adding the Widget Extension to the Capacitor Project

Since the widget extension needs to be added as a target in Xcode, follow these steps:

### Step 1: Open the Project
1. Open `~/Projects/bill-countdown/ios/App/App.xcodeproj` in Xcode

### Step 2: Add Widget Extension Target
1. In Xcode: **File → New → Target**
2. Search for **"Widget Extension"**
3. Select it and click **Next**
4. Configure:
   - **Product Name:** `DuezoWidgetExtension`
   - **Team:** Anthony Dyess
   - **Bundle Identifier:** `app.duezo.widget`
   - **Include Configuration App Intent:** **UNCHECK** this
   - **Project:** App
   - **Embed in Application:** App
5. Click **Finish**
6. If it asks "Activate scheme?", click **Activate**

### Step 3: Replace Generated Files
Xcode creates template files. Replace them with our custom code:

1. **Delete** all files Xcode created in the `DuezoWidgetExtension` group (select → Delete → Move to Trash)
2. **Right-click** the `DuezoWidgetExtension` group → **Add Files to "App"**
3. Navigate to `~/Projects/bill-countdown/ios/DuezoWidgetExtension/`
4. Select ALL files:
   - `DuezoWidget.swift`
   - `Info.plist`
   - `DuezoWidgetExtension.entitlements`
   - `Assets.xcassets/`
5. Make sure **"Copy items if needed"** is UNCHECKED (we want references)
6. Make sure target **DuezoWidgetExtension** is checked
7. Click **Add**

### Step 4: Configure Signing & Capabilities
1. Select **DuezoWidgetExtension** target
2. **Signing & Capabilities** tab:
   - Team: **Anthony Dyess**
   - Bundle Identifier: `app.duezo.widget`
   - Check "Automatically manage signing"
3. Click **+ Capability** → Add **App Groups**
4. Add group: `group.app.duezo`

### Step 5: Configure Main App (App target)
1. Select the **App** target (main Duezo app)
2. **Signing & Capabilities** → Add **App Groups** if not already there
3. Add group: `group.app.duezo`

### Step 6: Set Info.plist
1. Select **DuezoWidgetExtension** target → **Build Settings**
2. Search for "Info.plist"
3. Set **Info.plist File** to: `DuezoWidgetExtension/Info.plist`

### Step 7: Set Entitlements
1. In **Build Settings** for DuezoWidgetExtension target
2. Search for "entitlements"
3. Set **Code Signing Entitlements** to: `DuezoWidgetExtension/DuezoWidgetExtension.entitlements`

### Step 8: Build & Run
1. Select your iPhone from the device dropdown
2. Select the **App** scheme (not DuezoWidgetExtension)
3. Hit **Play** (▶️)
4. On your phone: long press home screen → + → search "Duezo" → add widget

## Color Themes
Users can select from: Orange (default), Teal, Blue, Purple, Green, Red
Stored in shared UserDefaults (group.app.duezo) key: `duezo_color_theme`

## How Auth Works
When user logs into the main Duezo app, the app saves the auth token to:
```swift
UserDefaults(suiteName: "group.app.duezo")?.set(token, forKey: "duezo_widget_token")
```
The widget reads this automatically — no manual configuration needed.

## Widget Sizes
- **Small:** Next bill countdown with colorful gradient background
- **Medium:** Split layout — countdown square + compact bill cards
- **Large:** Header with total due + 5 compact bill cards
