# Blazer Bites — frontend demo brief

Rewritten from the original prompt (`archive/backend/original-spec.md`) after a design review with the
`design-taste-frontend` app-screen rules. Goal now: **a polished, clickable front-end for the pitch.**
Everything runs in the browser on demo data; the Supabase backend is archived (`archive/backend/`).

## What the venture is (unchanged)
Student-run pop-up food carts at the edge of UAB's campus. Students have 10–15 minute gaps between
classes. The venture is judged on **Taste (50%)** every dish ≥ 4.3★, **Time (30%)** under 3 min from
arriving to food in hand for pre-orders and never over 10, **Price (20%)** every item ≤ $8, one item
always $5. The app must make the answer to "how long will I wait, and when can I get my food?" obvious.

## Design review: what changed from the original prompt, and why
| Original prompt | Problem (taste-skill app rules) | Now |
|---|---|---|
| Home = map + one big card per cart, all equally loud | The screen never answers its one question; four identical cards each shout "No wait" | Home leads with **one answer**: the soonest pickup ("Ready 11:40 at Sterne · 2 min wait") and an Order button. Carts follow as compact tinted rows; a small map sits below |
| Bottom nav: Home, Loyalty, Profile | No way to order from the nav | 5 tabs with **Order in the centre** as the one filled control |
| Cart → menu → window → checkout | Four steps before you even see food; the cart choice is rarely the decision | **Order** opens the menu straight away with the pickup spot pre-chosen (soonest); change it from a chip. Food first, then time |
| Generic green #1E6B52 + #F4C300, system dark mode | Not UAB | UAB brand colours (below). Light theme only for the demo |
| Magic-link sign-in, guest checkout | Friction in a 2-minute demo | A demo student ("Jordan Lee", @uab.edu) is signed in; checkout still offers "Order as guest" fields as a toggle |
| Crew + admin as 14 screens | Too much for a front-end pitch | **Team view**: one Kitchen board and one Pilot dashboard, reached from Profile |

## Palette (UAB brand) — light only
Colour goes on data, status and the one primary action, not on chrome (≈5–8% of pixels).
| Role | Value | Use |
|---|---|---|
| ground | `#F5F7F4` | page |
| surface | `#FFFFFF` | cards, sheets |
| raised | `#EDF1EC` | inputs, skeletons, quiet fills |
| line | `#E1E7E0` | rare 1px edges |
| ink | `#0F1F17` | text |
| muted | `#4E5C54` | secondary text (≥ 4.5:1) |
| primary — **UAB Green** | `#1A5632` | the one filled action per screen; white label |
| deep — **Dragon's Lair Green** | `#033319` | the Order tab, the pickup-number card, dark bands |
| gold — **UAB Gold** | `#FDB913` | fills only (the $5 deal, loyalty punches); text on it is `#033319`. Never gold text on white |
| **Campus Green** `#90D408` | tint `#EEF8DA` / ink `#2C4700` | "Fast now" / open status |
| **Ever Loyal Evergreen** `#17B045` | tint `#DDF4E4` / ink `#0B5A25` | success: Ready, rating good, positive deltas |
| **Bham Sky Blue** `#42CAF0` | tint `#DDF4FC` / ink `#0A4A5E` | info: express menu, tips |
| warning | tint `#FFF1CC` / ink `#6B4700` | busy, hold expiring |
| danger | tint `#FDE7E4` / ink `#8A1C17` | full, "fix or cut" |

**Cart tints** (pale tile + same-hue ink, from the pastel-consumer style): Sterne = Sky Blue, Campus Green
edge = Campus Green, Business & Engineering = Gold, Medical corridor = Evergreen.

## Style (dealt: `pastel-consumer`, seed 263330299, `.taste-skill/direction.json`)
- One large radius: 20px cards, stepping to 12 / 8 / 999 (pills, buttons) inside. Cards are white on the ground, separated by tone, **no resting shadows** (only sheets/menus float).
- Type: Bricolage Grotesque (already loaded), one family. Title 24/700, card title 16/600, body 15–16, meta 13, nothing under 12. Tabular figures on every price, time and count. The big answer figure (wait / pickup time / pickup number) 32–40px.
- Pale tiles with the dark of their own hue as ink for carts, statuses and allergen chips. Panels holding a list stay white.
- No gradients, glows, glass, emoji, icons in tinted circles on every card, uppercase tracked labels, or "Welcome back 👋".
- Motion (Motion library, `prefers-reduced-motion` respected): press feedback on every control, sheets sliding up, items landing in the bag, the status timeline filling. Nothing performs an entrance on load.
- Every tap target ≥ 44px, focus-visible rings, aria labels, one-handed reach: primary actions live in the bottom third.

## Navigation
Bottom bar, 5 tabs, labels under icons, safe-area aware:
**Home · Rewards · [Order] · Orders · Profile** — Order is the centre tab: a raised Dragon's Lair Green pill with
a white label and a bag icon, showing the bag count when non-empty. Active tabs are marked by ink colour + a 2px
indicator, never a coloured fill.

## Screens and routes
Student (AppShell with the bottom bar):
1. `/` **Home** — question: *when and where can I get food soonest?*
   - Answer card: soonest pickup time + cart + live wait ("2 min wait", or "Full right now · next window 12:20" — a wait over 10 min is never shown), one **Order** button.
   - Today strip: the $5 item (gold) and the chef's special (with its average rating).
   - Carts: one compact row per cart in its tint — name, spot, wait, next window, status chip (Open / Busy / Express menu / Closed), distance.
   - Map (Leaflet + OSM) of the 4 carts, ~180px tall, pins in cart tints.
   - Punch card progress (e.g. 7 / 10, "3 more for a free meal").
2. `/order` **Order** — the menu for the chosen cart. Pickup chip at the top ("Pickup at Sterne · soonest 11:40" → bottom sheet of carts with waits). 4 fixed dishes + weekly special, each: photo, name, price, ★ average + count, short description, allergen chips, calories, "Verified by UAB Nutrition students" tag where set, variant choice (rice bowl: chicken shawarma / tofu; $5 item: biscuit sandwich / soup cup). Add → bag. In surge: only express items with "Express menu while it's busy, so nobody waits long." "Coming next week" card for the next special. Allergen warning when a dish contains one of the profile's allergens. Sticky bottom bar: "Choose pickup time · 2 items · $14.50".
3. `/order/time` **Pickup time** — a horizontal row of 10-minute windows with spots left; full windows disabled; suggested window from "My class gaps" marked "Fits your 11:50 gap". Picking one places a 5-minute hold with a visible countdown. If everything near is full: offer the next open window or a quieter cart.
4. `/checkout` **Checkout** — bag lines with steppers, pickup summary, payment: Apple Pay / Google Pay / Card (demo: all succeed after a short spinner; a small "Demo payment, no card charged" note), Blazerbucks / Dragon Cash only when their flags are on. Loyalty reward applied automatically when available ("Free meal applied −$7.50"). Total with no hidden fees. One button: "Pay $14.50".
5. `/orders` **Orders** — active order on top (big status), then past orders with one-tap Reorder and "Rate it" where unrated.
6. `/orders/:token` **Tracking** — big pickup number on a Dragon's Lair card, QR code, window time, status timeline Received → Cooking → Ready → Picked up (advances on its own in the demo), "I'm here" button, "Running late?" moves to the next open window once. Ready triggers a toast + vibration (demo for web push).
7. `/orders/:token/rate` **Rate** — per dish: one-tap 1–5 stars, tags (Too salty, Perfect, Cold, Small portion, Would order again), optional comment. One rating per dish per order.
8. `/rewards` **Rewards** — 10-punch card (gold punches), progress, free meals available, how it works in one line, recent punches.
9. `/profile` **Profile** — name + "UAB student" badge, favourite dishes, allergen preferences (toggle chips), notification toggles, "My class gaps" editor (day + start/end), **Demo controls** (simulate rush at a cart → express menu; advance my order; reset demo), links to **Team view**.

Team (StaffShell, tablet-friendly, reached from Profile):
10. `/team/kitchen` **Kitchen board** — question: *what do we cook next?* Orders grouped by pickup window with batch totals ("11:40 · 9 hot chicken, 6 rice bowls"), tap to move Cooking → Ready (this updates the student's tracking screen live), walk-up line counter with the "Stop walk-ups" state at 15 people or 10 min, express-menu toggle, sold-out toggles.
11. `/team/pilot` **Pilot dashboard** — question: *is the pilot hitting taste, time and price?* Three blocks with their numbers from two weeks of sample data: Taste (avg ★ per dish 7/14 days, "Fix or cut" under 4.0 in red, "Ready for the fixed menu" ≥ 4.3 in green), Time (median and p90 arrival-to-food, pre-order vs walk-up, waits over 10 min = target 0), Price (max price ≤ $8, share of orders ≤ $7, food cost %), plus Viability (orders/day/cart vs 68 break-even and 100 target, repeat rate). "Sample data" label. **Export CSV** and **Export PDF** ("Blazer Bites pilot results").

## Demo data and behaviour (all in `src/demo/`)
- 4 carts at placeholder spots around 33.502, −86.806 (Sterne Library edge; Campus Green edge (by the residence halls); Business & Engineering edge; Medical corridor (near the hospital)). Medical is Closed.
- Launch menu: Hot chicken sandwich, slaw, pickles $7.00 (express) · Rice bowl $7.50 · Three street tacos $6.50 (express) · $5 value item $5.00 · Weekly special: shrimp and grits $8.00 · Coming next week: Nashville hot cauliflower.
- Windows are generated **relative to now** (next 10-minute mark onward for ~2 hours) so the demo works at any time of day; capacity 25, realistic spots left, one window full.
- Live waits come from `src/lib/wait.ts` and move as demo orders are placed and handed off.
- State persists in localStorage (so a refresh keeps your order) and "Reset demo" restores the seed.
- Placing an order auto-advances its status (Cooking after ~8 s, Ready after ~25 s) unless Team view or Demo controls move it first.
- Two weeks of deterministic sample history (seeded RNG) feed the pilot dashboard; totals are computed from rows.

## Keep from the original spec
Config in one place: `src/config/brand.ts` (name, tagline "Chef-quality food. Under $10. In your hand in under 3 minutes.", colours, logo placeholder), `src/config/rules.ts` (pickup window 10 min, 25 orders/window, walk-up cutoff 15, max wait 10, surge 6 min × 2 windows, express size 2, cut < 4.0 over 14 days, fixed-menu ≥ 4.3, every 10th meal free), `src/config/flags.ts` (`DRAGON_CASH_ENABLED`, `BLAZERBUCKS_ENABLED`, `LATE_NIGHT_ENABLED`, all false). `PaymentProvider` interface with the demo provider. PWA installable. No UAB or Sodexo logos.

## Quality bar
- `npm run typecheck`, `npm test`, `npm run build` green; existing unit tests for capacity, wait, surge, walk-up and rating flags keep passing.
- Checklist, shown working in the browser: a full window can't be booked; no cart ever shows a wait over 10 minutes; a simulated rush switches the student menu to express instantly; a dish under 4.0 for 14 days is flagged; the pilot report exports; order → kitchen → ready → rate works end to end.
- Inspected at 390px (primary), 768px and 1440px (the app stays a centred column ≤ 480px for student screens; team screens use the width).
