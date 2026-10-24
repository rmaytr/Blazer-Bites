# Blazer Bites

A student pop-up food pre-order PWA for UAB. This repo holds three things:

| Path | What it is |
|---|---|
| `index.html` | The choice page — two buttons, website or app. |
| `site/index.html` | The promotional / pitch site. |
| `app/` | The actual React app (Vite + TypeScript + Tailwind). Runs on in-browser demo data — see `app/docs/spec.md`. |

`docs/` and `archive/` are planning notes and an earlier Supabase backend that isn't wired up right now (see `archive/backend/README.md`).

## Deploying to Vercel

**One project.** Import this repo into Vercel with the default settings — Root Directory `.` (the repo root), no framework preset needed. `vercel.json` tells Vercel everything else:

- `buildCommand: npm run build` — the root `package.json`'s one script, `scripts/build.mjs`. It builds `app/` (with its asset paths set to `/app/`) and assembles everything into `dist/`: `dist/index.html` (the choice page), `dist/site/` (the promo page) and `dist/app/` (the built React app).
- `outputDirectory: dist`
- `rewrites` sends any `/app/*` path with no matching file to `/app/index.html`, so the app's own client-side routes (`/app/order`, `/app/checkout`, …) work on a hard refresh or a direct link.

- `sw.js` at the root is a kill switch. Earlier deploys served the app at `/` with a service worker scoped to the whole site, which kept answering `/` with the cached app. The build copies `sw.js` to `dist/sw.js`, so those browsers pick it up, drop the old worker and its caches, and reload onto the choice page. Leave it in place.

That's it — `/` is the choice page, `/site/` is the promo page, `/app/` is the live app, all on one domain, one deploy. No URLs need to be hand-edited after deploying.

## Local development

The app is developed from `app/` on its own (`cd app && npm run dev`, or just use this project's own dev tooling, which already points there). `index.html` and `site/index.html` are plain static files — open them directly, no build needed. `npm run build` at the repo root (not inside `app/`) runs the full combined build described above, the same thing Vercel runs.
