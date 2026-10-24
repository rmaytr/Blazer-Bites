# Frontend foundation, as built (read before coding a screen)

Frontend-only demo per `docs/spec.md`. No backend: every read and write goes to the in-browser demo store
(`src/demo/`). `@supabase/supabase-js` is uninstalled; the old client, realtime helper, Supabase `useSession`,
SignIn and AuthCallback pages are in `archive/backend/frontend/`. `src/types/db.ts` stays as a **type-only** source.

## Ownership

| Workstream | Owns (create/replace freely) | Must not edit |
|---|---|---|
| **A** | `src/pages/student/{Home,Order,PickupTime,Checkout}.tsx`, `src/features/order/**` | everything else |
| **B** | `src/pages/student/{Orders,Tracking,Rate,Rewards,Profile}.tsx`, `src/features/account/**` | everything else |
| **C** | `src/pages/team/**`, `src/features/team/**` | everything else |
| Foundation | `src/demo/**`, `src/hooks/**`, `src/lib/**`, `src/components/**`, `src/app/**`, `src/config/**`, `src/types/**`, `src/index.css` | — |

Need a foundation change (new hook field, new action, new token)? Ask; don't patch shared files. Put
screen-specific components in your `features/` folder. Every page keeps its `export default`.

## Routes → files

| Route | File | Owner | Notes |
|---|---|---|---|
| `/` | `pages/student/Home.tsx` | A | interim version works (tinted cart rows); rebuild per spec |
| `/order` | `pages/student/Order.tsx` | A | `?cart=<cartId>` optional preselect (Home rows link `/order?cart=sterne`) |
| `/order/time` | `pages/student/PickupTime.tsx` | A | |
| `/checkout` | `pages/student/Checkout.tsx` | A | bottom bar hidden on this route |
| `/orders` | `pages/student/Orders.tsx` | B | |
| `/orders/:token` | `pages/student/Tracking.tsx` | B | `:token` = `access_token`; QR encodes `orderQrUrl(token)` = `/orders/<token>` |
| `/orders/:token/rate` | `pages/student/Rate.tsx` | B | |
| `/rewards` | `pages/student/Rewards.tsx` | B | |
| `/profile` | `pages/student/Profile.tsx` | B | stub has a "Team view" link + "Reset demo"; keep both in the real screen |
| `/team` | redirect → `/team/kitchen` | — | |
| `/team/kitchen` | `pages/team/Kitchen.tsx` | C | pick the cart in-page (e.g. `?cart=`); default `sterne` |
| `/team/pilot` | `pages/team/Pilot.tsx` | C | |
| `*` | `pages/NotFound.tsx` | — | |

Student routes render in `AppShell` (centred column `max-w-[480px]`, `px-4`, 5-tab bar). Team routes render in
`StaffShell` (full width up to `max-w-6xl`, top bar "Team view" · Kitchen · Pilot dashboard · Back to app → `/profile`).

**Sticky bottom bars** on student screens sit on the nav: `fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))]`
inside a `mx-auto max-w-[480px]` wrapper. `--nav-h` = 4.5rem. `<main>` already pads for the nav; add the height
of your own bar as extra bottom padding. On `/checkout` (no nav) use `bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]`.

## Demo data (`src/demo/data.ts`)

- `CART_IDS = { sterne: 'sterne', campus: 'campus-green', bizeng: 'biz-eng', medical: 'medical' }`
  Carts: **Sterne** (Sterne Library edge, tint `sky`), **Campus Green** (residence halls, `campus`, busiest),
  **Biz & Eng** (`gold`), **Medical** (`evergreen`, **closed**, no windows).
- `MENU_IDS = { hotChicken, riceBowl, tacos, fiveDollar, shrimpGrits, cauliflower, veggieWrap }` →
  `'hot-chicken' | 'rice-bowl' | 'tacos' | 'five-dollar' | 'shrimp-grits' | 'cauliflower' | 'veggie-wrap'`.
  Hot chicken $7 express, verified · Rice bowl $7.50 variants `['Chicken shawarma','Tofu']`, verified · Tacos $6.50
  express, verified · $5 value item `is_five_dollar_item`, variants `['Biscuit sandwich','Soup cup']` · Shrimp and
  grits $8 `is_special` · Nashville hot cauliflower `is_next_special` · "Sample: Veggie wrap" archived sample (pilot only).
  Photos `/food/*.svg`. `avg_rating`/`rating_count` start at the 14-day pilot figures and update with live ratings.
- Exports: `SPOTS, CARTS, MENU, DEMO_USER_ID ('demo-jordan'), DEMO_LOCATION {lat,lng}, distanceMeters(a,b)`,
  `WINDOW_HORIZON_MIN (120), FIRST_PICKUP_NUMBER (101)`, `nextBoundary(now)`, `campusWeekday(d)`, `campusMinutes(d)`,
  `atCampusTime(now,'HH:MM',daysAgo)`, `makeClassGaps(now)`, `priceOf(menuId)`, `seedState(now)` (+ internal builders).
- Windows: every open cart, 10-min windows from the **next** 10-minute mark for 2 h (12 per cart), capacity 25,
  `booked_count` 2–23 (busier near noon), **one full window**: Campus Green's 3rd. Each booked spot is a real
  "crowd" order (guest names like "Ava M.") so the Kitchen board and the counts agree. Windows roll forward
  automatically while the app runs.
- Crowd orders cook from 4 min before their window and are handed off across its first 8 minutes, so live
  waits move by themselves. Seeded walk-up lines: Sterne 2, Campus Green 6, Biz & Eng 1.
- Profile: Jordan Lee, `jordan.lee@uab.edu`, `is_uab`, `allergen_prefs: []`, favourites hot chicken + tacos,
  class gaps Mon/Wed/Fri 11:50–12:05, Tue/Thu 12:20–12:35, and **today's** gap ~35 min from now (so
  "Fits your gap" always shows). Loyalty 7 punches / 0 rewards / 17 lifetime.
- Past orders (all picked up, `mine`): yesterday Sterne #118 hot chicken + tacos (**unrated**), 2 days ago Biz & Eng
  rice bowl (5★), 4 days ago shrimp & grits (4★), 7 days ago Campus Green hot chicken + biscuit (5★/4★).

## Store (`src/demo/store.ts`, `actions.ts`, `controls.ts`, `views.ts`)

- `getState(): DemoState`, `subscribe(fn): unsubscribe`, `commit(next)`, `tick(now?)`, `settle(state, now)`,
  `resetDemo(now?)`, `STORAGE_KEY = 'bb-demo-v1'`, `AUTO_COOKING_MS = 8000`, `AUTO_READY_MS = 25000`.
  Types `DemoState, DemoOrder, DemoCart, DemoSettings` (re-exported).
- Persisted to localStorage (`bb-demo-v1`, versioned; a bad blob or a blob from an earlier campus day → fresh seed).
  Another tab's changes arrive via the `storage` event (open Team view in a second tab and it stays in sync).
- While anything is subscribed, a 1 s tick expires holds (5 min), auto-advances orders, hands off crowd orders,
  rolls windows and recomputes cart waits (same rule as the archived `compute_cart_wait`: unpicked orders in
  started windows × handoff sec + walk-up line × 45 s).
- Student order auto-advance: Received → **Cooking at placed+8 s** → **Ready at placed+25 s**, from timestamps (survives
  refresh). Stays Ready until someone marks it picked up. Any manual move (Team view / Demo controls) stops its
  timer. `setAutoAdvance(false)` stops it for all student orders.
- `actions` (sync, throw `ApiError`) — the same list as `api.*` below plus `advanceOrder`, `setAutoAdvance`,
  `updateProfile`, `resetDemo`.

### `src/demo/controls.ts` (instant, no latency — use for Demo controls and the Team view)
```ts
setCartSurge(cartId, on): void            // express menu on/off ("simulate rush")
advanceOrder(orderId): OrderStatus        // one step: received→cooking→ready→picked_up; returns the new status
advanceOrderStatus(orderId, status): void // jump (or 'cancelled')
markPickedUp(orderId): void               // from any open status; no-op if already picked up
setWalkupLine(cartId, delta): number      // clamps 0..99, returns the new line
setItemSoldOut(cartId, itemId, on): void
openCart(cartId) / closeCart(cartId): void
setAutoAdvance(on): void
updateProfile(patch: ProfilePatch): void  // display_name, phone, allergen_prefs, favorite_item_ids, class_gaps, notify_ready, notify_reminder
resetDemo(): void                         // reseeds (windows relative to now); the bag is emptied too
```
These throw `ApiError` (`NOT_FOUND`, `INVALID_INPUT` for a finished order / backwards move).

## `src/lib/api.ts` (async, 150–350 ms latency; 0 in tests)

Same names as before. Errors are `ApiError` (`err.code`). `ApiError`, `API_ERROR_CODES`, `toApiError` now live in
`src/lib/apiError.ts` and are re-exported from `api.ts`. Also exported: `latency()`.
```ts
holdWindowSpot(windowId, holder): Promise<{ holdId; expiresAt }>   // WINDOW_FULL (full, or last spots held by others), WINDOW_CLOSED, CART_CLOSED, NOT_FOUND
                                                                    // one hold per holder: a new hold releases the holder's previous one
releaseHold(holdId): Promise<void>
quoteOrder(lines, { asGuest? }?): Promise<Quote>                    // reward applied automatically when rewards_available > 0 (not for guests)
placeOrder({ holdId, lines, paymentMethod, paymentRef?, guest? }): Promise<PlacedOrder>
        // HOLD_EXPIRED, WINDOW_FULL, WINDOW_CLOSED, CART_CLOSED, SOLD_OUT, NOT_EXPRESS (surge + non-express), NOT_FOUND,
        // INVALID_INPUT (empty bag, qty 1..9, missing variant, guest name/phone). Adds punches (not for guests).
getOrderByToken(token): Promise<OrderView | null>
submitRating({ token, orderItemId, stars, tags?, comment? }): Promise<void>  // NOT_PICKED_UP, ALREADY_RATED, INVALID_INPUT (stars 1..5)
moveOrderLate(token): Promise<{ newWindowId; startsAt }>             // ALREADY_MOVED (once per order), WINDOW_FULL (no later window)
markHere(token): Promise<void>                                       // sets arrived_at
placeWalkupOrder(cartId, lines, paymentMethod): Promise<{ orderId; pickupNumber }>
advanceOrderStatus(orderId, status): Promise<void>
findOrderForHandoff(cartId, code): Promise<OrderView | null>         // code = access token or pickup number
markPickedUp(orderId), setWalkupLine(cartId, delta): Promise<number>, setItemSoldOut(cartId, itemId, on),
setCartSurge(cartId, on), openCart(cartId), closeCart(cartId)
```
Removed: `generateWindows` (no admin). `holder`: use `getDeviceId()` from `src/lib/guest.ts`.

Payments (`src/lib/payments`): `getPaymentProviders(flags?)` → Apple Pay, Google Pay, Card (+ Blazerbucks /
Dragon Cash when their flags are on). Each is `demoProvider(id, label)`: `pay({ holdId, lines, guest, totalCents })`
waits ~0.9 s + latency, then calls `placeOrder` with that payment method → `{ ok: true, order } | { ok: false, error }`.

## Hooks (`src/hooks`, all live via `useSyncExternalStore`, no polling)

Data hooks return `QueryState<T> = { data: T | undefined; loading: boolean; error: Error | null; refetch(): Promise<void> }`.
`loading` is true (and `data` undefined) only for the first ~300 ms after app start (skeleton once); `error` is always
null (store reads cannot fail). Then data updates on every store change.

| Hook | `data` |
|---|---|
| `useSession()` | **not** QueryState: `{ profile: Profile, role: 'student', loading: false }` (no `session` field any more) |
| `useSettings()` | `{ data: Rules, loading: false, error: null }` (RULES from `src/config/rules.ts`) |
| `useCarts()` | `CartWithSpot[]` (all 4, with `spot`, `tint`, `live_wait_min`, `orders_ahead`, `next_window_start`, `surge`, `walkup_line`, `sold_out_item_ids`, `is_open`) |
| `useCart(cartId)` | `CartWithSpot \| null` |
| `useMenu(cartId)` | `{ data: MenuData, loading, error }` (no refetch); `MenuData = { items, all, nextSpecial, surge, cart }` — `items` = orderable now (sold-out removed, express only in surge); `all` = whole launch menu for greyed rows |
| `useWindows(cartId)` | `WindowWithSpots[]` = PickupWindow + `spots_left` (after live holds) + `is_full`; not ended, earliest first |
| `useOrderByToken(token)` | `OrderView \| null` (flat, see `src/types/app.ts`; now includes `cooking_at`) |
| `useMyOrders()` | `OrderWithItems[]` newest first: this device's orders (account and guest) |
| `useKitchenOrders(cartId)` | `KitchenOrder[]` (= `OrderWithItems`) today's non-cancelled orders at the cart, app + walk-up, placed order |
| `useLoyalty()` | `LoyaltyView = LoyaltyCard + { every: 10, toNext, recent: { orderId, placedAt, cartName, meals }[] }` |
| `usePilotStats()` | `{ data: PilotData, loading, error }` — see below |
| `useDemoSettings()` | `{ autoAdvance: boolean }` (plain value) |
| `useDemoState()` / `useDemoQuery(select, deps)` / `useBooted()` | low-level, for anything the hooks above don't cover |
| `useBasket()` / `BasketProvider` | unchanged: `lines, add(line, cartId), setQty(id, qty, variant?), remove, clear, count, cartId, hold {id, windowId, expiresAt}, holdId, setHold`. Reset demo clears it. |

`OrderWithItems = Order & { items: OrderLine[]; cart_name; customer_name; window: { id, starts_at, ends_at } | null }`,
`OrderLine = OrderItem & { menu_item: { id, name, photo_url, price_cents } | null; rated: boolean; stars: number | null }`.
`Order` gained `cooking_at: string | null`. `Profile.class_gaps` is `ClassGap[]` (`{ day: 'mon'..'sun', start: 'HH:MM', end: 'HH:MM' }`, campus time).
`CartWithSpot` gained `tint: CartTint` (`'sky' | 'campus' | 'gold' | 'evergreen'`).

### `usePilotStats()` → `PilotData` (computed from rows in `src/demo/pilot.ts`)
```ts
from, to (YYYY-MM-DD), serviceDays (10 weekdays in the last 14 days), orderCount (~2.7k)
taste: { id, name, photo_url, is_special, archived, avg7, count7, avg14, count14, flag: 'cut' | 'promote' | null }[]
       // veggie wrap ≈3.7 → 'cut' ("Fix or cut"); shrimp & grits ≈4.5 → 'promote' ("Ready for the fixed menu"); others 4.4–4.7, null
time:  { preorder: { medianMin ≈2.0, p90Min ≈3.5, count }, walkup: { medianMin ≈5.1, p90Min ≈6.7, count }, over10 (≈5), targetPreorderMin: 3 }
price: { maxPriceCents 800, capCents 800, allUnderCap, fiveDollarItem, shareOrdersUnder7 (orders with total ≤ $7, ≈0.47), foodCostPct ≈0.31 }
viability: { perCart: { cartId, name, ordersPerDay }[] (58–85), avgOrdersPerDayPerCart ≈68, breakEven 68, target 100, repeatRate ≈0.40, customers }
history: PilotHistory  // { days, from, to, orders: HistoryOrder[], ratings: HistoryRating[], snapshots: HistorySnapshot[] } for CSV export
```
Exact figures shift slightly with the date (which weekdays fall in the window); the flags don't. Constants:
`PRICE_CAP_CENTS, CHEAP_ORDER_CENTS, BREAK_EVEN_ORDERS_PER_DAY, TARGET_ORDERS_PER_DAY, TARGET_PREORDER_MIN, MAX_WAIT_MIN`
from `src/demo/pilot.ts`; `getPilotHistory(now?)` from `src/demo/history.ts` (memoised per day). Live ratings don't feed it.

## Tokens (Tailwind v4, `src/index.css`; values in `src/config/brand.ts`) — light only

| Class | Use |
|---|---|
| `bg-ground` `bg-surface` `bg-raised` `border-line` | page, cards/sheets, inputs/skeletons, rare 1px edge |
| `text-ink` `text-muted` | text, secondary text |
| `bg-primary text-on-primary` | UAB Green, the one filled action per screen (also `text-primary` for links) |
| `bg-deep text-on-deep` | Dragon's Lair Green: Order tab, pickup-number card, dark bands (`text-gold` is OK on deep) |
| `bg-gold text-on-gold` | fills only ($5 deal, punches); **never gold text on white/ground** |
| `bg-sky-tint text-sky-ink`, `bg-campus-tint text-campus-ink`, `bg-gold-tint text-gold-ink`, `bg-evergreen-tint text-evergreen-ink` | cart tiles by `cart.tint`; `text-ink`/`text-muted` also pass on all tints |
| `bg-campus` `bg-evergreen` `bg-sky` | brand accents for map pins / data marks only (not text) |
| `bg-info-bg text-info-ink` (sky) | express menu, tips |
| `bg-positive-bg text-positive-ink` (evergreen) | Ready, good rating, positive delta, "Ready for the fixed menu" |
| `bg-warning-bg text-warning-ink` | busy, hold expiring |
| `bg-danger-bg text-danger-ink` | full, "Fix or cut" |
| `bg-neutral-bg text-neutral-ink` | quiet chips |
| `rounded-card` (20px) `rounded-inner` (12px) `rounded-small` (8px) `rounded-full` | cards → inner → small; pills & buttons |
| `.num` | tabular figures on every price, time, count |
| `--nav-h` | bottom bar height |

All text pairs ≥ 4.5:1 (`src/config/brand.test.ts`). No dark mode (`dark:` variant and theme toggle removed).
No resting shadows (only `Sheet` floats). Type: Bricolage Grotesque; title 24/700 (`PageHeader`), card title 16/600,
body 15–16, meta 13, nothing under 12; big figures 32–40px.

## UI kit (`src/components/ui`, same names as before)

`Button` (`variant: primary|secondary|gold|ghost|danger`, `size: md|lg`, `loading`), `buttonClasses()`, `Card` (`as`, `flush`),
`StatusChip` (cart: Open = campus tint, Busy = warning, Express menu = info, Closed = neutral; order: Received neutral,
Cooking warning, Ready positive, Picked up neutral, Cancelled danger), `WaitBadge` (the **only** wait display; caps at 10,
"Full right now · Next window …"), `Skeleton`, `Sheet`, `QtyStepper`, `StarRating`, `AllergenIcons` + `allergenName`,
`Price`, `BigNumber` (`lg` 40px, `xl` 72px), `EmptyState`, `PageHeader` (`title, subtitle, back, action`),
`QrCode` + `orderQrUrl(token)` (→ `/orders/<token>`), `toast` + `Toaster` (Sonner, light). No `CartTile` — build cart rows in your feature folder.
Layout exports (`src/components/layout`): `AppShell`, `StaffShell`, icons `HomeIcon, RewardsIcon, BagIcon, ReceiptIcon, PersonIcon, ArrowLeftIcon`.

## Removed / renamed (vs `archive/backend/slice0-contracts.md`)

- `useQuery`, `QueryOptions`, `ORDER_POLL_MS`, `RequireRole`, `features/crew/SurgeBanner`, `StaffShell kind` prop, `lib/supabase`, `lib/realtime`,
  `setTheme/getTheme` (theme.ts now only `brandCss/installTheme`), `generateWindows`, routes `/signin`, `/auth/callback`,
  `/cart/:id`, `/o/:token`, `/loyalty`, `/crew/*`, `/admin/*` and their pages.
- `useSession` no longer has `session`. `brand.colors` has only `light` (+ `green`, `gold`).
- Tests: `src/test/setup.ts` provides an in-memory `localStorage` (Node 25's global one throws without a file).
  In tests, call `resetDemo(fixedNow)` in `beforeEach`; `tick(now)` drives time.
