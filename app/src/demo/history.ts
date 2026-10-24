// Two weeks of deterministic sample pilot data (seeded RNG) for the pilot dashboard. Generated on
// first use and memoised per campus day, so app start stays fast.
import { startOfCampusDay } from '@/lib/time'
import { CARTS, MENU, MENU_IDS, campusWeekday } from './data'
import { mulberry32, normal, randInt, weighted } from './rng'
import type { RatingTag } from '@/types/app'

const MIN_MS = 60_000
const DAY_MS = 86_400_000
export const HISTORY_DAYS = 14
const SEED = 2026

export interface HistoryItem {
  menu_item_id: string
  qty: number
  unit_price_cents: number
  plate_cost_cents: number
}

export interface HistoryOrder {
  id: string
  cart_id: string
  channel: 'app' | 'walk_up'
  /** Anonymous customer key for app orders (repeat rate); null for walk-ups. */
  customer: string | null
  service_date: string
  placed_at: string
  arrived_at: string
  ready_at: string
  picked_up_at: string
  /** Seconds from arriving to food in hand. */
  wait_sec: number
  total_cents: number
  items: HistoryItem[]
}

export interface HistoryRating {
  id: string
  order_id: string
  menu_item_id: string
  stars: number
  tags: RatingTag[]
  created_at: string
}

export interface HistorySnapshot {
  cart_id: string
  taken_at: string
  wait_min: number
  orders_ahead: number
  walkup_line: number
}

export interface PilotHistory {
  /** Campus dates (YYYY-MM-DD) of the service days included, oldest first. */
  days: string[]
  from: string
  to: string
  orders: HistoryOrder[]
  ratings: HistoryRating[]
  snapshots: HistorySnapshot[]
}

/** Typical orders per service day per cart (all four carts ran during the pilot). */
const DAILY: Record<string, number> = { sterne: 72, 'campus-green': 84, 'biz-eng': 62, medical: 58 }
const MIN_DAILY = 38
const MAX_DAILY = 96
const APP_SHARE = 0.66
const RATE_SHARE = 0.32

const MIX: readonly (readonly [string, number])[] = [
  [MENU_IDS.hotChicken, 27],
  [MENU_IDS.riceBowl, 21],
  [MENU_IDS.tacos, 19],
  [MENU_IDS.fiveDollar, 12],
  [MENU_IDS.shrimpGrits, 12],
  [MENU_IDS.veggieWrap, 9],
]

/** Star distributions per dish (P of 5, 4, 3, 2, 1). Means: 4.6, 4.4, 4.5, 4.4, 4.5, 3.5 (the veggie wrap is the one to cut). */
const STARS: Record<string, readonly number[]> = {
  [MENU_IDS.hotChicken]: [0.68, 0.25, 0.05, 0.02, 0],
  [MENU_IDS.riceBowl]: [0.55, 0.33, 0.09, 0.03, 0],
  [MENU_IDS.tacos]: [0.62, 0.28, 0.07, 0.03, 0],
  [MENU_IDS.fiveDollar]: [0.55, 0.33, 0.09, 0.03, 0],
  [MENU_IDS.shrimpGrits]: [0.62, 0.28, 0.07, 0.03, 0],
  [MENU_IDS.veggieWrap]: [0.18, 0.38, 0.28, 0.12, 0.04],
}

const GOOD_TAGS: readonly (readonly [RatingTag, number])[] = [
  ['perfect', 3],
  ['order_again', 4],
]
const BAD_TAGS: readonly (readonly [RatingTag, number])[] = [
  ['too_salty', 2],
  ['cold', 3],
  ['small_portion', 3],
]

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const lognormal = (rand: () => number, median: number, sigma: number) => median * Math.exp(sigma * normal(rand))

/** Minute of the 10:30–14:30 service, peaking around 12:15. */
function serviceMinute(rand: () => number): number {
  const m = 735 + 55 * normal(rand)
  return Math.round(Math.min(870, Math.max(630, m)))
}

function starsFor(rand: () => number, menuId: string): number {
  const p = STARS[menuId]
  return weighted(rand, [5, 4, 3, 2, 1].map((s, i) => [s, p[i]] as const))
}

function tagsFor(rand: () => number, stars: number): RatingTag[] {
  if (rand() < 0.4) return []
  return [weighted(rand, stars >= 4 ? GOOD_TAGS : BAD_TAGS)]
}

function generate(now: Date): PilotHistory {
  const rand = mulberry32(SEED)
  const menu = new Map(MENU.map((m) => [m.id, m]))
  const today = startOfCampusDay(now).getTime()
  const orders: HistoryOrder[] = []
  const ratings: HistoryRating[] = []
  const snapshots: HistorySnapshot[] = []
  const days: string[] = []

  for (let d = HISTORY_DAYS; d >= 1; d--) {
    const dayStart = startOfCampusDay(new Date(today - d * DAY_MS + 12 * 60 * MIN_MS)).getTime()
    const wd = campusWeekday(new Date(dayStart + 12 * 60 * MIN_MS))
    if (wd === 'sat' || wd === 'sun') continue
    days.push(ymd(new Date(dayStart + 12 * 60 * MIN_MS)))
    for (const cart of CARTS) {
      const n = Math.min(MAX_DAILY, Math.max(MIN_DAILY, Math.round(DAILY[cart.id] * (0.85 + 0.3 * rand()))))
      for (let i = 0; i < n; i++) {
        const id = `h-${cart.id}-${d}-${i}`
        const app = rand() < APP_SHARE
        const minute = serviceMinute(rand)
        const arrived = dayStart + minute * MIN_MS + randInt(rand, 0, 59) * 1000
        const waitSec = Math.round(app ? lognormal(rand, 120, 0.437) : lognormal(rand, 300, 0.25))
        const picked = arrived + waitSec * 1000
        const placed = app ? arrived - randInt(rand, 6, 70) * MIN_MS : arrived
        const lines = rand() < 0.28 ? 2 : 1
        const items: HistoryItem[] = []
        for (let l = 0; l < lines; l++) {
          const m = menu.get(weighted(rand, MIX))!
          items.push({ menu_item_id: m.id, qty: 1, unit_price_cents: m.price_cents, plate_cost_cents: m.plate_cost_cents })
        }
        const total = items.reduce((s, it) => s + it.unit_price_cents * it.qty, 0)
        orders.push({
          id,
          cart_id: cart.id,
          channel: app ? 'app' : 'walk_up',
          customer: null,
          service_date: days[days.length - 1],
          placed_at: new Date(placed).toISOString(),
          arrived_at: new Date(arrived).toISOString(),
          ready_at: new Date(picked - Math.min(waitSec * 500, 20_000)).toISOString(),
          picked_up_at: new Date(picked).toISOString(),
          wait_sec: waitSec,
          total_cents: total,
          items,
        })
        if (app) {
          items.forEach((it, k) => {
            if (rand() >= RATE_SHARE) return
            const stars = starsFor(rand, it.menu_item_id)
            ratings.push({
              id: `${id}-r${k}`,
              order_id: id,
              menu_item_id: it.menu_item_id,
              stars,
              tags: tagsFor(rand, stars),
              created_at: new Date(picked + randInt(rand, 5, 90) * MIN_MS).toISOString(),
            })
          })
        }
      }
      for (let m = 630; m <= 870; m += 10) {
        const lunch = Math.exp(-(((m - 735) / 70) ** 2))
        const walkup = Math.max(0, Math.round(lunch * 7 + normal(rand)))
        const ahead = Math.max(0, Math.round(lunch * 6 + normal(rand)))
        snapshots.push({
          cart_id: cart.id,
          taken_at: new Date(dayStart + m * MIN_MS).toISOString(),
          wait_min: Math.round(((ahead * 35 + walkup * 45) / 60) * 10) / 10,
          orders_ahead: ahead,
          walkup_line: walkup,
        })
      }
    }
  }

  assignCustomers(rand, orders)
  return { days, from: days[0], to: days[days.length - 1], orders, ratings, snapshots }
}

/** ~40% of app customers come back: singles get a fresh key, the rest share a pool of regulars. */
function assignCustomers(rand: () => number, orders: HistoryOrder[]): void {
  const app = orders.filter((o) => o.channel === 'app')
  const pool = Math.round(app.length * 0.154)
  let fresh = 0
  for (const o of app) {
    // shortcut: mutates rows built moments ago inside generate(); nothing else holds them yet.
    o.customer = rand() < 0.23 ? `c-new-${fresh++}` : `c-reg-${randInt(rand, 0, pool - 1)}`
  }
}

let cache: { day: string; history: PilotHistory } | null = null

/** The sample history ending yesterday. Same rows for the same campus day. */
export function getPilotHistory(now: Date = new Date()): PilotHistory {
  const day = ymd(startOfCampusDay(now))
  if (cache?.day !== day) cache = { day, history: generate(now) }
  return cache.history
}
