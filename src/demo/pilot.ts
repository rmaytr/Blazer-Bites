// Pilot dashboard figures, computed from the sample history rows (never hard-coded).
import { RULES } from '@/config/rules'
import { dishFlag, ratingsInWindow, type DishFlag } from '@/lib/ratings'
import { median, p90 } from '@/lib/stats'
import type { MenuItem } from '@/types/app'
import { CARTS } from './data'
import type { PilotHistory } from './history'

export const PRICE_CAP_CENTS = 800
export const CHEAP_ORDER_CENTS = 700
export const BREAK_EVEN_ORDERS_PER_DAY = 68
export const TARGET_ORDERS_PER_DAY = 100
export const TARGET_PREORDER_MIN = 3
export const MAX_WAIT_MIN = 10

export interface DishStats {
  id: string
  name: string
  photo_url: string | null
  is_special: boolean
  /** Retired / sample dish (the veggie wrap). */
  archived: boolean
  avg7: number | null
  count7: number
  avg14: number | null
  count14: number
  /** 'cut' = "Fix or cut" (< 4.0 over 14 days), 'promote' = "Ready for the fixed menu" (special ≥ 4.3). */
  flag: DishFlag
}

export interface WaitStats {
  medianMin: number | null
  p90Min: number | null
  count: number
}

export interface PilotStats {
  from: string
  to: string
  serviceDays: number
  orderCount: number
  taste: DishStats[]
  time: {
    preorder: WaitStats
    walkup: WaitStats
    /** Orders that waited over 10 min from arriving to food in hand (target 0). */
    over10: number
    targetPreorderMin: number
  }
  price: {
    maxPriceCents: number
    capCents: number
    allUnderCap: boolean
    fiveDollarItem: string | null
    /** Share (0–1) of orders whose total was $7.00 or less. */
    shareOrdersUnder7: number
    /** Plate cost / price over every meal sold (0–1). */
    foodCostPct: number
  }
  viability: {
    perCart: { cartId: string; name: string; ordersPerDay: number }[]
    avgOrdersPerDayPerCart: number
    breakEven: number
    target: number
    /** Share (0–1) of app customers who ordered more than once. */
    repeatRate: number
    customers: number
  }
}

const toMin = (sec: number | null) => (sec === null ? null : sec / 60)

function waitStats(secs: number[]): WaitStats {
  return { medianMin: toMin(median(secs)), p90Min: toMin(p90(secs)), count: secs.length }
}

export function computePilotStats(h: PilotHistory, menu: readonly MenuItem[], now: Date = new Date()): PilotStats {
  const rated = new Set(h.ratings.map((r) => r.menu_item_id))
  const taste = menu
    .filter((m) => rated.has(m.id))
    .map((m) => {
      const rows = h.ratings.filter((r) => r.menu_item_id === m.id)
      const d7 = ratingsInWindow(rows, 7, now)
      const d14 = ratingsInWindow(rows, RULES.cutDays, now)
      return {
        id: m.id,
        name: m.name,
        photo_url: m.photo_url,
        is_special: m.is_special,
        archived: m.status === 'archived',
        avg7: d7.avg,
        count7: d7.count,
        avg14: d14.avg,
        count14: d14.count,
        flag: dishFlag({ ...d14, isSpecial: m.is_special }),
      }
    })

  const app = h.orders.filter((o) => o.channel === 'app')
  const walk = h.orders.filter((o) => o.channel === 'walk_up')

  const sellable = menu.filter((m) => m.status === 'active' && !m.is_next_special)
  const maxPriceCents = Math.max(...sellable.map((m) => m.price_cents))
  const meals = h.orders.flatMap((o) => o.items)
  const revenue = meals.reduce((s, i) => s + i.unit_price_cents * i.qty, 0)
  const cost = meals.reduce((s, i) => s + i.plate_cost_cents * i.qty, 0)

  const days = Math.max(1, h.days.length)
  const perCart = CARTS.map((c) => ({
    cartId: c.id,
    name: c.name,
    ordersPerDay: h.orders.filter((o) => o.cart_id === c.id).length / days,
  }))

  const visits = new Map<string, number>()
  for (const o of app) if (o.customer) visits.set(o.customer, (visits.get(o.customer) ?? 0) + 1)
  const repeaters = [...visits.values()].filter((n) => n > 1).length

  return {
    from: h.from,
    to: h.to,
    serviceDays: h.days.length,
    orderCount: h.orders.length,
    taste,
    time: {
      preorder: waitStats(app.map((o) => o.wait_sec)),
      walkup: waitStats(walk.map((o) => o.wait_sec)),
      over10: h.orders.filter((o) => o.wait_sec > MAX_WAIT_MIN * 60).length,
      targetPreorderMin: TARGET_PREORDER_MIN,
    },
    price: {
      maxPriceCents,
      capCents: PRICE_CAP_CENTS,
      allUnderCap: maxPriceCents <= PRICE_CAP_CENTS,
      fiveDollarItem: sellable.find((m) => m.is_five_dollar_item)?.name ?? null,
      shareOrdersUnder7: h.orders.filter((o) => o.total_cents <= CHEAP_ORDER_CENTS).length / Math.max(1, h.orders.length),
      foodCostPct: revenue > 0 ? cost / revenue : 0,
    },
    viability: {
      perCart,
      avgOrdersPerDayPerCart: perCart.reduce((s, c) => s + c.ordersPerDay, 0) / Math.max(1, perCart.length),
      breakEven: BREAK_EVEN_ORDERS_PER_DAY,
      target: TARGET_ORDERS_PER_DAY,
      repeatRate: visits.size > 0 ? repeaters / visits.size : 0,
      customers: visits.size,
    },
  }
}
