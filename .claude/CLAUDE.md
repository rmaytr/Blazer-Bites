# Cafe ordering site

Current scope: **frontend-only demo** per `docs/spec.md`. All data comes from `src/demo/` (in-browser store).
The Supabase backend is archived in `archive/backend/` — do not import or reconnect it unless asked.

## Skill routing

Several installed skills overlap. In this project, use only the skill named for each job and ignore the rest, even when their descriptions match.

| Job | Use | Do not use |
|-----|-----|------------|
| Visual direction, layout, type, palette, look-and-fix loop | `design-taste-frontend` (lead; its rules win any conflict) | `frontend-design`, `ui-ux-pro-max`, `website-design:*`, `ecc:frontend-design-direction`, `ecc:taste*` |
| Design audit / polish pass after building | `impeccable` | `audit-suite:*` design audits, `design:design-critique` |
| Interface guidelines review (a11y, forms, focus) | `web-design-guidelines` (in `~/.claude/skills`) | `audit-suite:web-design-guidelines` |
| React / Next.js performance | `vercel-react-best-practices` (in `~/.claude/skills`) | `audit-suite:vercel-react-best-practices` |
| UI polish details | `emil-design-eng` | `audit-suite:emil-design-engineering`, `*make-interfaces-feel-better` |
| Building an animation | `animate`, then `review-animations` | `gsap-*`, `ecc:motion-*`, `audit-suite:web-animation-design` |
| Animation jank / performance | `animation-performance` | `gsap-performance` |
| Phone feel (tap states, safe areas, 100vh, sheets) | `mobile-native`, `apple-design` for gestures and springs | — |
| Components | `shadcn` | — |
| Toasts (e.g. "Added to cart") | `ask-sonner` | — |
| Edge-case stress test of a screen | `break-ui` | — |

## Animation library

Use **Motion** (`motion` package, formerly Framer Motion) plus plain CSS transitions. Do not add GSAP: one animation library only, to keep the mobile bundle small. Always respect `prefers-reduced-motion`.
