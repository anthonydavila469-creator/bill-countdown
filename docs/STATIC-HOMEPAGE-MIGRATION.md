# Duezo Static Homepage Migration

Goal
- Freeze the approved localhost marketing homepage into a literal static artifact and serve that artifact at `/` instead of relying on `app/page.tsx`.

Chosen implementation
- Same repo, but `/` will be owned by `public/landing-static/index.html` served as a static file.
- `app/page.tsx` will stop being the live marketing homepage path.
- Vercel routing will rewrite `/` to `/landing-static/index.html` so the homepage is delivered as fixed bytes from the CDN.
- The app/router/API surface remains in Next for `/login`, `/dashboard`, `/api/*`, `/about`, `/blog`, etc.

Why this path
- It avoids a second Vercel project and cross-project path routing complexity.
- It removes the homepage from the App Router render path that has drifted from localhost.
- It still preserves Duezo's existing app/API routes in the same deployment.

Artifact source
- Generated from the local production render at `http://127.0.0.1:3040`.
- Next runtime scripts were stripped.
- The page CSS was inlined from the production-rendered CSS chunk.
- Native redirect behavior was re-added as a tiny direct inline script.
- JSON-LD remains embedded in the static page.

Files intended to own the migration
- `public/landing-static/index.html`
- `vercel.json`
- remove or archive `app/page.tsx` once static `/` routing is in place

Validation plan
- serve `public/landing-static/index.html` locally with python http.server
- compare screenshot to approved localhost screenshot
- build Next app after `app/page.tsx` is removed/archived and routing is updated
- deploy only after static and live screenshots match
