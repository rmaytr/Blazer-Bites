// Demo seed: carts, launch menu, pickup windows relative to now, the demo student and their past orders.
// Pure functions of `now`; the store (store.ts) calls seedState() on first run and on resetDemo().
import { RULES } from '@/config/rules'
import { startOfCampusDay, TIME_ZONE } from '@/lib/time'
import type { ClassGap, MenuItem, OrderItem, PickupWindow, Profile, Rating, Spot, Weekday } from '@/types/app'
import { hashString, mulberry32, randInt, weighted } from './rng'
import type { DemoCart, DemoOrder, DemoState } from './types'

export const DEMO_VERSION = 1 as const

const MIN_MS = 60_000
const DAY_MS = 86_400_000

/** How far ahead pickup windows are generated. */
export const WINDOW_HORIZON_MIN = 120
/** First pickup number of the day at each cart. */
export const FIRST_PICKUP_NUMBER = 101

export const CART_IDS = { sterne: 'sterne', campus: 'campus-green', bizeng: 'biz-eng', medical: 'medical' } as const
export const MENU_IDS = {
  hotChicken: 'hot-chicken',
  riceBowl: 'rice-bowl',
  tacos: 'tacos',
  fiveDollar: 'five-dollar',
  shrimpGrits: 'shrimp-grits',
  cauliflower: 'cauliflower',
  veggieWrap: 'veggie-wrap',
} as const

/** Where the demo student "is" (centre of campus), for distances on Home. */
export const DEMO_LOCATION = { lat: 33.502, lng: -86.806 } as const

/** Great-circle distance in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

const spot = (id: string, name: string, lat: number, lng: number, notes: string): Spot => ({
  id,
  name,
  lat,
  lng,
  notes,
  is_placeholder: true,
  is_late_night: false,
})

export const SPOTS: Spot[] = [
  spot('spot-sterne', 'Sterne Library edge', 33.50215, -86.80985, 'Sidewalk just off campus, by the coffee shop wall.'),
  spot('spot-campus', 'Campus Green edge (by the residence halls)', 33.5044, -86.8052, 'Corner lot facing the residence halls.'),
  spot('spot-bizeng', 'Business & Engineering edge', 33.49975, -86.8041, 'Plaza edge across the street.'),
  spot('spot-medical', 'Medical corridor (near the hospital)', 33.50605, -86.803, 'Wide sidewalk near the hospital.'),
]

const cart = (
  id: string,
  name: string,
  spot_id: string,
  tint: DemoCart['tint'],
  is_open: boolean,
  walkup_line: number,
  avg_handoff_sec: number,
): DemoCart => ({
  id,
  name,
  spot_id,
  tint,
  is_open,
  surge: false,
  surge_alert: false,
  walkup_line,
  sold_out_item_ids: [],
  live_wait_min: 0,
  orders_ahead: 0,
  next_window_start: null,
  avg_handoff_sec,
  updated_at: new Date(0).toISOString(),
  next_pickup_number: FIRST_PICKUP_NUMBER,
})

/** Load factor per open cart (share of capacity booked at the lunch peak). Campus Green is the busiest. */
const LOAD: Record<string, number> = { [CART_IDS.sterne]: 0.5, [CART_IDS.campus]: 0.72, [CART_IDS.bizeng]: 0.42 }

export const CARTS: DemoCart[] = [
  cart(CART_IDS.sterne, 'Sterne', 'spot-sterne', 'sky', true, 2, 35),
  cart(CART_IDS.campus, 'Campus Green', 'spot-campus', 'campus', true, 6, 40),
  cart(CART_IDS.bizeng, 'Biz & Eng', 'spot-bizeng', 'gold', true, 1, 30),
  cart(CART_IDS.medical, 'Medical', 'spot-medical', 'evergreen', false, 0, 35),
]

const item = (p: Partial<MenuItem> & Pick<MenuItem, 'id' | 'name' | 'price_cents' | 'plate_cost_cents'>): MenuItem => ({
  description: null,
  photo_url: null,
  allergens: [],
  calories: null,
  variants: [],
  is_five_dollar_item: false,
  is_special: false,
  is_next_special: false,
  is_express: false,
  nutrition_verified: false,
  status: 'active',
  avg_rating: null,
  rating_count: 0,
  is_sample: false,
  created_at: '2026-10-01T15:00:00.000Z',
  ...p,
})

/** Launch menu. avg_rating / rating_count are the 14-day pilot history figures (history.ts), then move with live ratings. */
export const MENU: MenuItem[] = [
  item({
    id: MENU_IDS.hotChicken,
    name: 'Hot chicken sandwich',
    description: 'Crispy Nashville-style hot chicken with slaw and pickles on a toasted bun.',
    price_cents: 700,
    plate_cost_cents: 220,
    photo_url: '/food/hot-chicken.svg',
    allergens: ['gluten', 'egg', 'dairy'],
    calories: 720,
    is_express: true,
    nutrition_verified: true,
    avg_rating: 4.68,
    rating_count: 194,
  }),
  item({
    id: MENU_IDS.riceBowl,
    name: 'Rice bowl',
    description: 'Herbed rice, pickled onions, cucumber and tahini sauce. Chicken shawarma or crispy tofu.',
    price_cents: 750,
    plate_cost_cents: 230,
    photo_url: '/food/rice-bowl.svg',
    allergens: ['sesame', 'soy'],
    calories: 640,
    variants: ['Chicken shawarma', 'Tofu'],
    nutrition_verified: true,
    avg_rating: 4.43,
    rating_count: 141,
  }),
  item({
    id: MENU_IDS.tacos,
    name: 'Three street tacos',
    description: 'Corn tortillas, chile-lime chicken, onion, cilantro and cotija.',
    price_cents: 650,
    plate_cost_cents: 200,
    photo_url: '/food/tacos.svg',
    allergens: ['dairy'],
    calories: 560,
    is_express: true,
    nutrition_verified: true,
    avg_rating: 4.62,
    rating_count: 129,
  }),
  item({
    id: MENU_IDS.fiveDollar,
    name: '$5 value item',
    description: 'Buttermilk biscuit sandwich with egg and cheese, or a cup of the soup of the day.',
    price_cents: 500,
    plate_cost_cents: 150,
    photo_url: '/food/biscuit.svg',
    allergens: ['gluten', 'dairy', 'egg'],
    calories: 450,
    variants: ['Biscuit sandwich', 'Soup cup'],
    is_five_dollar_item: true,
    avg_rating: 4.44,
    rating_count: 75,
  }),
  item({
    id: MENU_IDS.shrimpGrits,
    name: 'Shrimp and grits',
    description: "Weekly chef's special: Gulf shrimp over stone-ground cheddar grits with a smoky pan sauce.",
    price_cents: 800,
    plate_cost_cents: 260,
    photo_url: '/food/shrimp-grits.svg',
    allergens: ['shellfish', 'dairy'],
    calories: 680,
    is_special: true,
    avg_rating: 4.54,
    rating_count: 78,
  }),
  item({
    id: MENU_IDS.cauliflower,
    name: 'Nashville hot cauliflower',
    description: 'Coming next week: crispy hot cauliflower with ranch slaw.',
    price_cents: 700,
    plate_cost_cents: 190,
    photo_url: '/food/cauliflower.svg',
    allergens: ['gluten', 'dairy'],
    calories: 520,
    is_next_special: true,
  }),
  item({
    id: MENU_IDS.veggieWrap,
    name: 'Sample: Veggie wrap',
    description: 'Retired special (sample data): grilled vegetables and hummus in a flour wrap.',
    price_cents: 650,
    plate_cost_cents: 180,
    photo_url: '/food/veggie-wrap.svg',
    allergens: ['gluten', 'sesame'],
    calories: 480,
    is_special: true,
    status: 'archived',
    is_sample: true,
    avg_rating: 3.72,
    rating_count: 50,
  }),
]

// ---------------------------------------------------------------------------
// Time helpers (campus time)
// ---------------------------------------------------------------------------

const weekdayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TIME_ZONE })

export function campusWeekday(d: Date): Weekday {
  return weekdayFmt.format(d).toLowerCase().slice(0, 3) as Weekday
}

/** Minutes since campus midnight. */
export const campusMinutes = (d: Date): number => Math.floor((d.getTime() - startOfCampusDay(d).getTime()) / MIN_MS)

/** The instant of campus 'HH:MM' on the day `daysAgo` before `now`. */
export function atCampusTime(now: Date, hhmm: string, daysAgo = 0): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const day = startOfCampusDay(new Date(now.getTime() - daysAgo * DAY_MS))
  return new Date(day.getTime() + (h * 60 + m) * MIN_MS)
}

const hhmm = (mins: number): string => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

/** Next multiple of `windowMin` minutes strictly after now. */
export function nextBoundary(now: Date, windowMin: number = RULES.windowMin): Date {
  const step = windowMin * MIN_MS
  return new Date(Math.floor(now.getTime() / step) * step + step)
}

// ---------------------------------------------------------------------------
// Windows and the crowd of other students' orders
// ---------------------------------------------------------------------------

export const windowId = (cartId: string, startsAt: Date): string => `w-${cartId}-${startsAt.getTime()}`

/** Index (from the first generated window) of the one full window at the busiest cart. */
const FULL_WINDOW = { cartId: CART_IDS.campus, index: 2 }
const MAX_NOT_FULL = RULES.ordersPerWindow - 2

/** Believable bookings: busier around noon, per-cart load, deterministic per window. */
function bookedFor(cartId: string, startsAt: Date): number {
  const rand = mulberry32(hashString(windowId(cartId, startsAt)))
  const m = campusMinutes(startsAt)
  const lunch = 0.45 + 0.55 * Math.exp(-(((m - 735) / 80) ** 2))
  const n = Math.round(RULES.ordersPerWindow * (LOAD[cartId] ?? 0.4) * lunch) + randInt(rand, -2, 2)
  return Math.max(2, Math.min(MAX_NOT_FULL, n))
}

/**
 * Windows for every open cart from the next boundary for WINDOW_HORIZON_MIN minutes. `seed` marks
 * the first generation (only then is one window made full). booked_count here is the target; the
 * store creates that many crowd orders so the kitchen board and the counts agree.
 */
export function makeWindows(now: Date, carts: readonly DemoCart[], seed: boolean): PickupWindow[] {
  const first = nextBoundary(now)
  const count = WINDOW_HORIZON_MIN / RULES.windowMin
  const out: PickupWindow[] = []
  for (const c of carts) {
    if (!c.is_open) continue
    for (let i = 0; i < count; i++) {
      const starts = new Date(first.getTime() + i * RULES.windowMin * MIN_MS)
      const full = seed && c.id === FULL_WINDOW.cartId && i === FULL_WINDOW.index
      out.push({
        id: windowId(c.id, starts),
        cart_id: c.id,
        service_day_id: `day-${c.id}`,
        starts_at: starts.toISOString(),
        ends_at: new Date(starts.getTime() + RULES.windowMin * MIN_MS).toISOString(),
        capacity: RULES.ordersPerWindow,
        booked_count: full ? RULES.ordersPerWindow : bookedFor(c.id, starts),
      })
    }
  }
  return out
}

const GUESTS = [
  'Ava M.', 'Noah T.', 'Mia R.', 'Liam K.', 'Zoe P.', 'Elijah W.', 'Aaliyah J.', 'Mason B.', 'Chloe D.', 'Jayden S.',
  'Harper L.', 'Caleb N.', 'Imani F.', 'Lucas G.', 'Nia H.', 'Owen C.', 'Layla V.', 'Isaiah A.', 'Grace O.', 'Miles E.',
]

const LAUNCH_MIX: readonly (readonly [string, number])[] = [
  [MENU_IDS.hotChicken, 30],
  [MENU_IDS.riceBowl, 22],
  [MENU_IDS.tacos, 21],
  [MENU_IDS.fiveDollar, 13],
  [MENU_IDS.shrimpGrits, 14],
]

const menuById = new Map(MENU.map((m) => [m.id, m]))

export function priceOf(menuItemId: string): number {
  return menuById.get(menuItemId)?.price_cents ?? 0
}

/** Blank order row with every column set; callers override what they need. */
export function orderRow(p: Partial<DemoOrder> & Pick<DemoOrder, 'id' | 'cart_id' | 'pickup_number' | 'placed_at'>): DemoOrder {
  return {
    user_id: null,
    guest_name: null,
    guest_phone: null,
    service_day_id: `day-${p.cart_id}`,
    window_id: null,
    original_window_id: null,
    moved_late: false,
    status: 'received',
    channel: 'app',
    payment_method: 'demo',
    payment_ref: null,
    subtotal_cents: 0,
    discount_cents: 0,
    total_cents: 0,
    loyalty_applied: false,
    access_token: `tok-${p.id}`,
    cooking_at: null,
    ready_at: null,
    arrived_at: null,
    picked_up_at: null,
    reminder_sent_at: null,
    is_sample: false,
    auto: null,
    mine: false,
    due_at: null,
    ...p,
  }
}

/** booked_count crowd orders for one window, handed off across its first 8 minutes. */
export function makeCrowdOrders(
  w: PickupWindow,
  firstPickupNumber: number,
): { orders: DemoOrder[]; items: OrderItem[] } {
  const rand = mulberry32(hashString(`crowd-${w.id}`))
  const start = new Date(w.starts_at).getTime()
  const orders: DemoOrder[] = []
  const items: OrderItem[] = []
  for (let i = 0; i < w.booked_count; i++) {
    const id = `${w.id}-o${i}`
    const lines = rand() < 0.25 ? 2 : 1
    let subtotal = 0
    for (let l = 0; l < lines; l++) {
      const menuId = weighted(rand, LAUNCH_MIX)
      const m = menuById.get(menuId)
      const variant = m && m.variants.length > 0 ? m.variants[randInt(rand, 0, m.variants.length - 1)] : null
      const unit = priceOf(menuId)
      subtotal += unit
      items.push({ id: `${id}-i${l}`, order_id: id, menu_item_id: menuId, variant, qty: 1, unit_price_cents: unit })
    }
    orders.push(
      orderRow({
        id,
        cart_id: w.cart_id,
        window_id: w.id,
        pickup_number: firstPickupNumber + i,
        placed_at: new Date(start - randInt(rand, 8, 70) * MIN_MS).toISOString(),
        guest_name: GUESTS[randInt(rand, 0, GUESTS.length - 1)],
        subtotal_cents: subtotal,
        total_cents: subtotal,
        auto: 'crowd',
        due_at: new Date(start + Math.round(((i + 1) / (w.booked_count + 1)) * 8 * MIN_MS)).toISOString(),
      }),
    )
  }
  return { orders, items }
}

// ---------------------------------------------------------------------------
// The demo student
// ---------------------------------------------------------------------------

export const DEMO_USER_ID = 'demo-jordan'

const GAP_MARGIN_MIN = 35
const GAP_LENGTH_MIN = 15

/** Weekly gaps, plus today's gap placed ~35 min from now so "Fits your gap" always shows. */
export function makeClassGaps(now: Date): ClassGap[] {
  const weekly: ClassGap[] = [
    { day: 'mon', start: '11:50', end: '12:05' },
    { day: 'tue', start: '12:20', end: '12:35' },
    { day: 'wed', start: '11:50', end: '12:05' },
    { day: 'thu', start: '12:20', end: '12:35' },
    { day: 'fri', start: '11:50', end: '12:05' },
  ]
  const today = campusWeekday(now)
  const start = Math.ceil((campusMinutes(now) + GAP_MARGIN_MIN) / 5) * 5
  const gap: ClassGap = { day: today, start: hhmm(start), end: hhmm(start + GAP_LENGTH_MIN) }
  return [...weekly.filter((g) => g.day !== today), gap]
}

export function makeProfile(now: Date): Profile {
  return {
    id: DEMO_USER_ID,
    email: 'jordan.lee@uab.edu',
    display_name: 'Jordan Lee',
    phone: null,
    role: 'student',
    is_uab: true,
    allergen_prefs: [],
    favorite_item_ids: [MENU_IDS.hotChicken, MENU_IDS.tacos],
    class_gaps: makeClassGaps(now),
    notify_ready: true,
    notify_reminder: true,
    created_at: '2026-09-02T15:00:00.000Z',
  }
}

interface PastOrderSpec {
  daysAgo: number
  cartId: string
  at: string
  pickup: number
  lines: { menuId: string; variant?: string; qty: number; stars?: number; tags?: string[] }[]
}

/** Jordan's history: the most recent order is unrated so Orders shows "Rate it". */
const PAST: PastOrderSpec[] = [
  { daysAgo: 1, cartId: CART_IDS.sterne, at: '11:50', pickup: 118, lines: [{ menuId: MENU_IDS.hotChicken, qty: 1 }, { menuId: MENU_IDS.tacos, qty: 1 }] },
  { daysAgo: 2, cartId: CART_IDS.bizeng, at: '12:20', pickup: 124, lines: [{ menuId: MENU_IDS.riceBowl, variant: 'Chicken shawarma', qty: 1, stars: 5, tags: ['perfect', 'order_again'] }] },
  { daysAgo: 4, cartId: CART_IDS.sterne, at: '11:50', pickup: 109, lines: [{ menuId: MENU_IDS.shrimpGrits, qty: 1, stars: 4, tags: ['order_again'] }] },
  {
    daysAgo: 7,
    cartId: CART_IDS.campus,
    at: '12:10',
    pickup: 131,
    lines: [
      { menuId: MENU_IDS.hotChicken, qty: 1, stars: 5, tags: ['perfect'] },
      { menuId: MENU_IDS.fiveDollar, variant: 'Biscuit sandwich', qty: 1, stars: 4, tags: [] },
    ],
  },
]

function makePastOrders(now: Date): { windows: PickupWindow[]; orders: DemoOrder[]; items: OrderItem[]; ratings: Rating[] } {
  const windows: PickupWindow[] = []
  const orders: DemoOrder[] = []
  const items: OrderItem[] = []
  const ratings: Rating[] = []
  PAST.forEach((p, n) => {
    const starts = atCampusTime(now, p.at, p.daysAgo)
    const w: PickupWindow = {
      id: windowId(p.cartId, starts),
      cart_id: p.cartId,
      service_day_id: `day-${p.cartId}`,
      starts_at: starts.toISOString(),
      ends_at: new Date(starts.getTime() + RULES.windowMin * MIN_MS).toISOString(),
      capacity: RULES.ordersPerWindow,
      booked_count: 14,
    }
    windows.push(w)
    const id = `past-${n + 1}`
    const t = (min: number) => new Date(starts.getTime() + min * MIN_MS).toISOString()
    const subtotal = p.lines.reduce((s, l) => s + priceOf(l.menuId) * l.qty, 0)
    orders.push(
      orderRow({
        id,
        cart_id: p.cartId,
        window_id: w.id,
        pickup_number: p.pickup,
        user_id: DEMO_USER_ID,
        placed_at: t(-25),
        cooking_at: t(-6),
        ready_at: t(1),
        arrived_at: t(2),
        picked_up_at: t(4),
        status: 'picked_up',
        payment_method: 'apple_pay',
        subtotal_cents: subtotal,
        total_cents: subtotal,
        access_token: `jordan-past-${n + 1}`,
        mine: true,
      }),
    )
    p.lines.forEach((l, i) => {
      const itemId = `${id}-i${i}`
      items.push({ id: itemId, order_id: id, menu_item_id: l.menuId, variant: l.variant ?? null, qty: l.qty, unit_price_cents: priceOf(l.menuId) })
      if (l.stars) {
        ratings.push({ id: `r-${itemId}`, order_item_id: itemId, stars: l.stars, tags: l.tags ?? [], comment: null, created_at: t(30), is_sample: false })
      }
    })
  })
  return { windows, orders, items, ratings }
}

// ---------------------------------------------------------------------------
// Whole seed
// ---------------------------------------------------------------------------

/** Add crowd orders for windows that have none yet; returns updated carts (pickup counters). */
export function fillCrowd(
  carts: DemoCart[],
  windows: readonly PickupWindow[],
): { carts: DemoCart[]; orders: DemoOrder[]; items: OrderItem[] } {
  const next = new Map(carts.map((c) => [c.id, c.next_pickup_number]))
  const orders: DemoOrder[] = []
  const items: OrderItem[] = []
  for (const w of [...windows].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const first = next.get(w.cart_id) ?? FIRST_PICKUP_NUMBER
    const crowd = makeCrowdOrders(w, first)
    next.set(w.cart_id, first + crowd.orders.length)
    orders.push(...crowd.orders)
    items.push(...crowd.items)
  }
  return { carts: carts.map((c) => ({ ...c, next_pickup_number: next.get(c.id) ?? c.next_pickup_number })), orders, items }
}

export function seedState(now: Date = new Date()): DemoState {
  const windows = makeWindows(now, CARTS, true)
  const crowd = fillCrowd(CARTS, windows)
  const past = makePastOrders(now)
  return {
    version: DEMO_VERSION,
    seededAt: now.toISOString(),
    spots: SPOTS,
    carts: crowd.carts,
    menu: MENU,
    windows: [...past.windows, ...windows],
    holds: [],
    orders: [...past.orders, ...crowd.orders],
    orderItems: [...past.items, ...crowd.items],
    ratings: past.ratings,
    loyalty: { user_id: DEMO_USER_ID, punches: 7, rewards_available: 0, lifetime_meals: 17 },
    profile: makeProfile(now),
    settings: { autoAdvance: true },
  }
}
