# Blazer Bites

A student pop-up food pre-order PWA for UAB. This repo holds three things:

| Path | What it is | Build needed? |
|---|---|---|
| `index.html` | The choice page — two buttons, website or app. This is what should sit at your main domain's `/`. | No, plain static file. |
| `site/index.html` | The promotional / pitch site. | No, plain static file (self-contained, includes its own screenshot as a data URI). |
| `app/` | The actual React app (Vite + TypeScript + Tailwind). Runs on in-browser demo data — see `app/docs/spec.md`. | Yes — `npm install && npm run build` inside `app/`. |

`docs/` and `archive/` are planning notes and an earlier Supabase backend that isn't wired up right now (see `archive/backend/README.md`).

## Deploying to Vercel

Two separate Vercel projects from this one GitHub repo, both pointing at the same repo but with a different **Root Directory**:

1. **Main site** (the choice page + promo page)
   - New Project → import this repo → **Root Directory: `.`** (the repo root, i.e. leave it as-is)
   - Framework Preset: **Other** (no build step — Vercel will just serve `index.html` and `site/index.html` as static files)
   - Deploy. Your domain's `/` is now the choice page, and `/site/` is the promo page.

2. **The app**
   - New Project → import this repo again → **Root Directory: `app`**
   - Framework Preset: **Vite** (auto-detected)
   - Deploy. You'll get a second URL, e.g. `https://blazer-bites-app.vercel.app`.

3. **Wire them together.** `index.html` and `site/index.html` currently link to the app with the placeholder path `/app/`. Once step 2 gives you the app's real URL, replace every `href="/app/"` in those two files with that URL (3 occurrences in `site/index.html`, 1 in `index.html`) and redeploy the main site. You can edit the files right on GitHub — no local setup needed.

Everything else (custom domain, etc.) is standard Vercel project settings.
