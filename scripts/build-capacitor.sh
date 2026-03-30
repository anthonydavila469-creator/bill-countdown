#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "📱 Building static export for Capacitor..."

# 1. Move server-only files out of the way
echo "  Moving server routes aside..."
mv app/api /tmp/duezo-api-backup
[ -f app/sitemap.ts ] && mv app/sitemap.ts /tmp/duezo-sitemap-backup.ts
[ -f middleware.ts ] && mv middleware.ts /tmp/duezo-middleware-backup.ts

# Move auth callback route handlers
find app/auth -name "route.ts" -exec mv {} {}.bak \; 2>/dev/null || true

# 2. Remove 'force-dynamic' from all pages (they're all client-side anyway)
echo "  Removing force-dynamic exports..."
find app -name "*.tsx" -o -name "*.ts" | xargs grep -l "force-dynamic" 2>/dev/null | while read f; do
  sed -i '' "s/export const dynamic = 'force-dynamic';//g" "$f"
  sed -i '' 's/export const dynamic = "force-dynamic";//g' "$f"
done

# 3. Swap next.config for static export (no Sentry)
cp next.config.ts next.config.ts.backup
cat > next.config.ts << 'CONFIG'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
CONFIG

# 4. Build static export
echo "  Building static export..."
npx next build

# 5. Restore EVERYTHING
echo "  Restoring all files..."
mv /tmp/duezo-api-backup app/api
[ -f /tmp/duezo-sitemap-backup.ts ] && mv /tmp/duezo-sitemap-backup.ts app/sitemap.ts
[ -f /tmp/duezo-middleware-backup.ts ] && mv /tmp/duezo-middleware-backup.ts middleware.ts
find app/auth -name "route.ts.bak" -exec bash -c 'mv "$1" "${1%.bak}"' _ {} \; 2>/dev/null || true
mv next.config.ts.backup next.config.ts

# Restore force-dynamic via git
git checkout -- app/signup/layout.tsx app/dashboard/settings/page.tsx app/dashboard/calendar/page.tsx app/dashboard/admin/page.tsx app/dashboard/layout.tsx app/dashboard/history/page.tsx app/review/layout.tsx app/login/layout.tsx 2>/dev/null || true

# 6. Sync to Capacitor
echo "  Syncing to Capacitor iOS..."
npx cap sync ios

echo "✅ Static build complete! Ready for Xcode archive."
echo "   Output: out/"
ls -la out/index.html 2>/dev/null && echo "   index.html exists ✓"
