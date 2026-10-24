# Slice 0 as built (read this before coding against the foundation)

Plan §4 still holds; these are the deviations and additions. Exports are re-exported from `src/hooks/index.ts` and `src/components/ui/index.ts`.

## Frontend
- `OrderView` is **flat**: Order fields + `cart_name, spot_name, window_starts_at, window_ends_at, customer_name, items: OrderViewItem[]` (`{id, menu_item_id, name, photo_url, variant, qty, unit_price_cents, rated, stars}`).
- RPC basket JSON: `{menu_item_id, variant, qty}`. Guest phone stored as digits only (`^[0-9]{10,15}$`); use `isValidPhone` from `src/lib/guest.ts`.
- Extra error codes: `WINDOW_CLOSED, NOT_FOUND, INVALID_INPUT, PAYMENT_FAILED`.
- `RULES` includes `avgWalkupServiceSec: 45, defaultHandoffSec: 30, demoMode: true`; a drift test checks it against `supabase/seed.sql`.
- `displayWait` hard-caps at 10 (`HARD_MAX_WAIT_MIN`) even if admin raises max; rounds up; null → "No wait"; non-finite → full.
- `useBasket`: `lines, add(line, cartId), setQty, remove, clear, count, cartId, hold {id, windowId, expiresAt}, holdId, setHold(hold|null)`. Adding from another cart resets basket and drops the hold.
- Hooks: `useSettings()` → `{data: Rules, loading, error}`; `useMenu(cartId)` → `{data: {items, nextSpecial, surge, cart}, loading, error}`; other data hooks → `{data, loading, error, refetch}` (shared `useQuery`). `useOrderByToken` polls every 5 s until done.
- `StaffShell kind='crew'|'admin'`. It renders `SurgeBanner` from `src/features/crew/SurgeBanner.tsx` (props `{cart}`) — a stub owned by workstream B.
- Payments: `getPaymentProviders(flags?)`; workstream D appends providers to the `PROVIDERS` array in `src/lib/payments/index.ts`.
- Helpers: `src/lib/guest.ts` (`getGuest, saveGuest, clearGuest, isValidPhone, getDeviceId, getOrderTokens, rememberOrderToken`), `theme.ts`, `redirect.ts` (`safeNext, rememberNext, takeNext`), `cn.ts`, `time.ts` (`formatWindow, formatTime, startOfCampusDay, TIME_ZONE`), `ratings.ts` also `ratingsInWindow`, `MIN_RATINGS_FOR_FLAG` (5), `stats.ts` also `percentile`, `ui` also `buttonClasses, allergenName, orderQrUrl, Toaster`.
- Tailwind tokens (CSS vars `--bb-*`): `bg-ground, bg-surface, bg-raised, text-ink, text-muted, bg-primary, text-on-primary, bg-gold, text-on-gold`, `positive|warning|danger|neutral` `-bg`/`-ink`, `rounded-card`, `.num` for tabular numbers. Gold is a fill colour, never text on white.
- Real pages so far: Home, SignIn, AuthCallback. All other pages are stubs to replace.
- No lint script. Playwright configured, browsers not installed, no specs yet.
