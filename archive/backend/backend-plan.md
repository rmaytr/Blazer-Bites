# Blazer Bites — implementation plan

Produced by the ECC planner agent (orch-build-mvp, Phase 2). Spec: `docs/spec.md`.
Gate 1 changes vs. the planner draft: Tailwind **v4** (`@tailwindcss/vite`, no tailwind.config) instead of v3; React 19 (react-leaflet 5 needs it).
Migrations, seed and type generation are applied through the Supabase MCP by the orchestrator (no Docker / CLI login); agents write the SQL files only.

## Overview
Mobile-first PWA, three surfaces (student, crew, admin) on hosted Supabase. **All writes go through SECURITY DEFINER RPCs**; clients read via RLS and never insert/update tables directly except a few admin/lead tables. Capacity, holds, wait, surge and pricing are server-side; pure-TS mirrors in `src/lib/` exist for unit tests and UI. **Money is integer cents everywhere.**

## 1. Data model
Migrations: `supabase/migrations/YYYYMMDDHHMMSS_name.sql`. All RPCs `security definer set search_path = ''`, check caller role inside, `execute` revoked from `anon` where staff-only.

Enums: `user_role`(student,crew,lead,admin) · `order_status`(received,cooking,ready,picked_up,cancelled) · `order_channel`(app,walk_up) · `payment_method`(demo,card,apple_pay,google_pay,blazerbucks,dragon_cash,cash,walkup_card) · `item_status`(active,sold_out_global,archived) · `prep_kind`(taste,hot_hold,cold_hold,food_safety).

| Table | Columns (key constraints) |
|---|---|
| `users` | id uuid PK→auth.users, email, display_name, phone, role user_role default 'student', is_uab bool GENERATED (email ilike '%@uab.edu'), allergen_prefs text[], favorite_item_ids uuid[], class_gaps jsonb `[{dow,start,end}]`, notify_ready bool, notify_reminder bool, created_at. Trigger on auth.users insert creates it; trigger blocks role change unless caller admin. |
| `spots` | id, name, lat, lng, notes, is_placeholder bool default true, is_late_night bool |
| `carts` | id, name, spot_id→spots, is_open bool, surge bool (express on), surge_alert bool, walkup_line int ≥0, sold_out_item_ids uuid[], live_wait_min numeric, orders_ahead int, next_window_start timestamptz, avg_handoff_sec int, updated_at. **Realtime source for Home.** |
| `service_days` | id, cart_id, spot_id, service_date date, opens_at time, closes_at time, is_late_night bool, window_capacity int, next_pickup_number int default 101. UNIQUE(cart_id, service_date, opens_at) |
| `pickup_windows` | id, cart_id, service_day_id, starts_at timestamptz, ends_at, capacity int, booked_count int default 0, CHECK(booked_count BETWEEN 0 AND capacity), UNIQUE(cart_id, starts_at) |
| `window_holds` | id uuid, window_id, holder text (auth.uid or device id), expires_at; index (window_id, expires_at). Active while expires_at > now(). |
| `menu_items` | id, name, description, price_cents CHECK(≤800), plate_cost_cents, photo_url, allergens text[], calories int, variants text[], is_five_dollar_item (CHECK → price_cents=500), is_special, is_next_special, is_express, nutrition_verified, status item_status, avg_rating numeric, rating_count int (ratings trigger), is_sample bool |
| `orders` | id, user_id null→users, guest_name, guest_phone, cart_id, window_id null (walk-up), original_window_id, moved_late bool, status, pickup_number int, channel, payment_method, payment_ref, subtotal_cents, discount_cents, total_cents, loyalty_applied bool, **access_token uuid default gen_random_uuid() UNIQUE**, placed_at, ready_at, arrived_at, picked_up_at, reminder_sent_at, is_sample. CHECK(user_id IS NOT NULL OR (guest_name AND guest_phone NOT NULL)). |
| `order_items` | id, order_id, menu_item_id, variant, qty CHECK>0, unit_price_cents (snapshot) |
| `ratings` | id, order_item_id UNIQUE, stars CHECK 1–5, tags text[] ⊆ {too_salty,perfect,cold,small_portion,order_again}, comment varchar(500), created_at, is_sample |
| `loyalty_cards` | user_id PK, punches int, rewards_available int, lifetime_meals int |
| `wait_snapshots` | id, cart_id, window_id, taken_at, wait_min numeric (raw, uncapped), orders_ahead, walkup_line, is_sample |
| `prep_checks` | id, cart_id, service_date, kind, menu_item_id null, passed bool, temp_f numeric, notes, checked_by, checked_at |
| `settings` | single row (id=1 CHECK) mirroring `RULES`: window_min, orders_per_window, walkup_cutoff, max_wait_min, surge_trigger_min, surge_windows, express_size, cut_threshold, cut_days, fixed_menu_threshold, loyalty_every, hold_min (5), avg_walkup_service_sec, default_handoff_sec, demo_mode bool |
| `push_subscriptions` (D) | id, user_id null, order_id null, endpoint UNIQUE, p256dh, auth |

**RLS** (helpers `app_role()`, `is_staff()` read users.role for auth.uid()):
- anon: SELECT spots, carts, service_days, pickup_windows, menu_items (status≠archived), settings. No orders/ratings/users — token RPCs only.
- student: + SELECT/UPDATE own users row (role locked), SELECT own orders, order_items, ratings, loyalty_cards.
- crew: + SELECT all orders/order_items, wait_snapshots, prep_checks. Writes via crew RPCs.
- lead: + INSERT prep_checks, lead RPCs.
- admin: SELECT all; INSERT/UPDATE menu_items, carts, spots, service_days, pickup_windows, settings, users.role; storage bucket `menu-photos` (public read, admin write).

**Guest / QR access:** `place_order` returns `access_token` (v4 UUID secret). Order QR encodes `${origin}/o/${token}`; same QR is used for tracking/rating by student and read by crew scanner at handoff. Guests keep the token in localStorage. Token RPCs (`get_order_by_token`, `submit_rating`, `move_order_late`, `mark_here`) are the only anon path to an order. Guest live status: poll `get_order_by_token` every 5–10 s (realtime broadcast optional). Pickup-number lookup is staff-only.

**Payment gate:** `place_order` accepts `'demo'` only when `settings.demo_mode` is true; other methods require a service_role JWT (the Square edge function after a successful charge).

**RPCs**
- `hold_window_spot(p_window_id uuid, p_holder text) → (hold_id, expires_at)` — `FOR UPDATE` lock; `WINDOW_FULL` if booked_count + active holds ≥ capacity; one active hold per holder per window.
- `release_hold(p_hold_id uuid)`
- `quote_order(p_items jsonb, p_user_id uuid default auth.uid()) → (subtotal_cents, discount_cents, total_cents, loyalty_applied)` — DB prices; loyalty.
- `place_order(p_hold_id, p_items jsonb, p_payment_method, p_payment_ref, p_guest_name, p_guest_phone, p_user_id default auth.uid()) → (order_id, pickup_number, access_token, total_cents)` — hold live → consume, booked_count++, reject sold-out / non-express during surge, punch loyalty, next pickup number under row lock.
- `place_walkup_order(p_cart_id, p_items jsonb, p_payment_method) → (order_id, pickup_number)` — crew; channel walk_up, no window, arrived_at=now().
- `compute_cart_wait(p_cart_id) → (wait_min, orders_ahead, next_window_id, next_window_start, is_full)` — writes to carts; AFTER trigger on orders insert/status update and on carts.walkup_line. Formula: (non-picked-up app orders in current+earlier windows today) × avg_handoff_sec + walkup_line × avg_walkup_service_sec, ÷60. avg_handoff_sec = avg(picked_up_at − arrived_at) last 20 handoffs today, else default_handoff_sec.
- `snapshot_waits() → int` — pg_cron every 2 min; inserts snapshots for open carts then `check_surge`.
- `check_surge(p_cart_id) → bool` — sets surge_alert when max snapshot wait in each of last `surge_windows` windows > `surge_trigger_min`.
- `advance_order_status(p_order_id, p_status)` — crew; received→cooking→ready, sets ready_at.
- `find_order_for_handoff(p_cart_id, p_code text) → jsonb` — crew; token or pickup number; sets arrived_at if null.
- `mark_here(p_token uuid)` — student arrival signal.
- `mark_picked_up(p_order_id)` — crew; sets picked_up_at.
- `move_order_late(p_token) → (new_window_id, starts_at)` — once; next window with capacity; moves booked_count.
- `get_order_by_token(p_token) → jsonb` (order + items + rated flags) · `submit_rating(p_token, p_order_item_id, p_stars, p_tags text[], p_comment)` (order must be picked_up)
- `set_cart_surge(p_cart_id, p_on)` (lead) · `set_walkup_line(p_cart_id, p_delta int)` (crew) · `set_item_sold_out(p_cart_id, p_item_id, p_on)` (crew)
- `open_cart(p_cart_id)` (lead; `SIGNOFF_MISSING` unless today has passed taste check for every active item + hot_hold, cold_hold, food_safety) · `close_cart(p_cart_id)`
- `generate_windows(p_service_day_id) → int` (admin; used by seed)
- C adds admin-only: `report_today()`, `report_taste(p_days)`, `report_time(p_from, p_to)`, `report_price()`, `report_viability(p_from, p_to)`, `report_pilot(p_from, p_to)`.
- D adds `save_push_subscription(p_sub jsonb, p_token uuid default null)`, `due_reminders()`.

## 2. Screens and routes
All routes in `src/app/router.tsx` (Slice 0) as lazy imports of stub pages. Workstreams fill stubs, never edit the router. Guard: `<RequireRole roles=[...]>`.

**Student** (`AppShell`, bottom nav), public unless marked:
`/` Home map + cart cards + $5/special banner + loyalty progress · `/signin` magic link + guest · `/auth/callback` · `/cart/:cartId` Menu · `/cart/:cartId/windows` Window picker (also target of "Stop walk-ups" QR) · `/checkout` · `/o/:token` Tracking (QR, statuses, Running late, I'm here) · `/o/:token/rate` Rate · `/loyalty` [student+] · `/profile` [student+]

**Crew** (`StaffShell` + surge banner) [crew, lead, admin]:
`/crew` pick cart · `/crew/:cartId/kitchen` · `/crew/:cartId/handoff` · `/crew/:cartId/register` · `/crew/:cartId/sold-out` · `/crew/:cartId/signoff` [lead, admin]

**Admin** [admin]: `/admin` Today · `/admin/taste` · `/admin/time` · `/admin/price` · `/admin/viability` · `/admin/menu` · `/admin/schedule` · `/admin/settings` (rules + demo_mode) · `/admin/report`

## 3. Slices
**Slice 0 — Foundation** (one agent): scaffold (Vite React 19 TS, Tailwind v4, React Router, Vitest, Playwright, motion, sonner, leaflet/react-leaflet, qrcode.react, @yudiel/react-qr-scanner, jspdf, @supabase/supabase-js, vite-plugin-pwa), config files, migrations (schema, rls, functions, platform: pg_cron + realtime publication + storage bucket), seed (4 placeholder spots, 4 carts, Mon–Fri 10:30–14:30 days for past 14 + next 7, hidden late-night, spec menu, retired sample "Sample: Veggie wrap" ≈3.7 avg, 2 weeks of `is_sample` orders/ratings/snapshots via setseed+generate_series, repeat guests reuse phones), types, pure libs with tests first, hooks, api, UI kit, shells, guards, stub pages.

**Slice 1 — Thin vertical** (same agent): Home list → Menu → Window picker (hold) → Checkout (demo) → Tracking → Kitchen (Cooking/Ready) → Handoff by pickup number → Rate. `e2e/order-flow.spec.ts` written first.

**Parallel workstreams** (after Slice 1):
- **A Student** — owns `src/pages/student/**`, `src/features/student/**`. Map (Leaflet/OSM, geolocation distance), cart cards with `<WaitBadge>`, banner, loyalty progress; menu photos/ratings/allergens + pref warnings/verified tag/surge note/"Coming next week"/skeletons/cache; window picker (full disabled, next open or quieter cart, class-gap suggestion `features/student/classGaps.ts`+test, 5-min hold countdown); checkout via `getPaymentProviders()` + `quoteOrder`; tracking (Running late, I'm here, `enablePush`); rate (tags, comment); loyalty; profile.
- **B Crew** — owns `src/pages/crew/**`, `src/features/crew/**`. Kitchen board grouped by window with `batchByWindow()` (pure+test) + day prep totals; handoff (QR camera, token from URL, typed fallback → `markPickedUp`); register (quick-tap walk-up, line counter, `shouldStopWalkups` → full-screen Stop + QR to `/cart/:id/windows`); surge banner one-tap `setCartSurge`; sign-off checklist w/ temps → prep_checks → `openCart`; sold-out toggles; tablet layout.
- **C Admin** — owns `src/pages/admin/**`, `src/features/admin/**`, `supabase/migrations/*_reports.sql`. Report RPCs (median/p90 via percentile_cont, waits>10 from raw snapshots, windows at cap, "Needs a second cart" if spot at cap ≥3 days), Tailwind bars (no chart lib), `dishFlag` red/green, sample-data badge, menu manager w/ photo upload, schedule/spots + `generateWindows`, settings editor, pilot report `buildPilotCsv()`/`buildPilotPdf()` titled "Blazer Bites pilot results" + tests.
- **D Payments/push/integration** — owns `src/lib/payments/**` (after Slice 0), `src/lib/push.ts`, `src/sw.ts`, `supabase/functions/**`, `supabase/migrations/*_push.sql`, `e2e/**`, `scripts/verify-db.ts`, `README.md`. Square provider (card/Apple/Google Pay) + edge fn `square-pay` (quote → Square Order → Payment, idempotency=hold_id → place_order via service role → refund on failure); Blazerbucks/Dragon Cash stubs behind flags with TODO; web push (VAPID, `push-send` on ready/surge_alert, `push-reminders`); `verify-db.ts` (concurrent holds on last spot → exactly one wins; demo rejected when demo_mode off); README.

## 4. Shared contracts (Slice 0 exports)
- `src/config/brand.ts` `brand`; `rules.ts` `RULES`, `type Rules` (camelCase of settings columns); `flags.ts` `FLAGS` {DRAGON_CASH_ENABLED, BLAZERBUCKS_ENABLED, LATE_NIGHT_ENABLED, PAYMENT_MODE:'demo'|'square'} from `import.meta.env`.
- `src/lib/supabase.ts` `supabase: SupabaseClient<Database>`; `src/types/db.ts` `Database`; `src/types/app.ts` Role, OrderStatus, Channel, PaymentMethod, Spot, Cart, CartWithSpot, ServiceDay, PickupWindow, MenuItem, Order, OrderItem, Rating, Settings, WaitSnapshot, BasketLine{menuItemId,variant?,qty}, PlacedOrder{orderId,pickupNumber,accessToken,totalCents}, OrderView.
- `src/lib/api.ts`: typed wrapper per RPC, throws `ApiError{code}` (WINDOW_FULL, HOLD_EXPIRED, SOLD_OUT, SIGNOFF_MISSING, ALREADY_MOVED, ALREADY_RATED): holdWindowSpot, releaseHold, quoteOrder, placeOrder, placeWalkupOrder, getOrderByToken, submitRating, moveOrderLate, markHere, advanceOrderStatus, findOrderForHandoff, markPickedUp, setCartSurge, setWalkupLine, setItemSoldOut, openCart, closeCart, generateWindows.
- Pure libs + tests: `wait.ts` computeWait, displayWait(min, maxWaitMin, nextWindowStart) → {kind:'minutes',minutes}|{kind:'full',nextWindow}; `capacity.ts` spotsLeft, canHold, nextOpenWindow; `surge.ts` shouldSurge; `walkup.ts` shouldStopWalkups; `ratings.ts` dishFlag → 'cut'|'promote'|null; `stats.ts` median, p90; `loyalty.ts` applyLoyalty; `cartStatus.ts` cartStatus → 'open'|'busy'|'express'|'closed'; `money.ts` formatCents; `time.ts` formatWindow.
- `src/lib/realtime.ts` subscribeTable(table, filter, cb) → unsubscribe.
- `src/lib/payments/types.ts` `PaymentProvider { id; label; isAvailable(); mount?(el); pay({holdId, lines, guest?, totalCents}) → {ok:true, order}|{ok:false, error} }`; `index.ts` getPaymentProviders(); `demo.ts` demoProvider.
- `src/lib/push.ts` stub: isPushSupported(), enablePush({orderToken?}) → 'granted'|'denied'|'unsupported'.
- Hooks `{data, loading, error}`: useSession → {session, profile, role, loading}; useSettings → Rules; useCarts (realtime); useCart(id); useMenu(cartId) (sold-out + surge filtering, localStorage SWR); useWindows(cartId) realtime; useOrderByToken(token); useMyOrders; useKitchenOrders(cartId) realtime; useBasket (context + localStorage: lines, add, remove, clear, cartId, holdId, setHold).
- UI kit `src/components/ui/`: Button, Card, StatusChip, WaitBadge (sole wait renderer, uses displayWait), Skeleton, Sheet, QtyStepper, StarRating, AllergenIcons, Price, BigNumber, EmptyState, PageHeader, QrCode, toast. Layout: AppShell, StaffShell, RequireRole.

## 5. Risks / decisions
- Arrival time: crew scan sets arrived_at unless student tapped "I'm here" (understates scan-only arrivals).
- Square: Apple Pay needs domain verification on deployed HTTPS; demo is pitch default.
- Hosted DB: pg_cron needed; seed must be idempotent (delete is_sample rows first).
- Hold abuse by anon device ids: accepted for pilot.
- Loyalty is account-only; late-night hidden by client flag only.
- RULES vs settings seed drift: test compares them.

## Checklist mapping
| Item | Proven by |
|---|---|
| Full window can't be booked | capacity.test.ts, DB CHECK, verify-db concurrent holds, disabled UI |
| No wait over 10 min shown | wait.test.ts displayWait; WaitBadge sole renderer |
| Surge → express in real time | surge.test.ts, e2e surge step, verify-db |
| Dish < 4.0 for 14 days flagged | ratings.test.ts, seeded Veggie wrap red on /admin/taste |
| Pilot report exports | report.test.ts, manual click |
| Order → kitchen → handoff → rating | e2e/order-flow.spec.ts |
