// Kitchen board logic: orders grouped by pickup window with batch totals, and today's prep totals. Pure.
import { MENU_IDS } from '@/demo/data'
import type { KitchenOrder, OrderStatus } from '@/types/app'

/** Crew words for each dish: [one, many, title]. Unknown dishes fall back to their menu name. */
const DISH_WORDS: Record<string, readonly [string, string, string]> = {
  [MENU_IDS.hotChicken]: ['hot chicken', 'hot chicken', 'Hot chicken'],
  [MENU_IDS.riceBowl]: ['rice bowl', 'rice bowls', 'Rice bowl'],
  [MENU_IDS.tacos]: ['tacos', 'tacos', 'Street tacos'],
  [MENU_IDS.fiveDollar]: ['$5 item', '$5 items', '$5 value item'],
  [MENU_IDS.shrimpGrits]: ['shrimp & grits', 'shrimp & grits', 'Shrimp & grits'],
  [MENU_IDS.cauliflower]: ['hot cauliflower', 'hot cauliflower', 'Hot cauliflower'],
  [MENU_IDS.veggieWrap]: ['veggie wrap', 'veggie wraps', 'Veggie wrap'],
}

export function dishWord(id: string, qty: number, fallback = id): string {
  const w = DISH_WORDS[id]
  return w ? (qty === 1 ? w[0] : w[1]) : fallback
}

export function dishTitle(id: string, fallback = id): string {
  return DISH_WORDS[id]?.[2] ?? fallback
}

export interface DishCount {
  id: string
  name: string
  qty: number
}

export interface WindowBatch {
  /** Window id, or 'walkup' for orders with no window. */
  key: string
  startsAt: string | null
  endsAt: string | null
  orders: KitchenOrder[]
  /** Every dish in the window, most first. */
  totals: DishCount[]
  /** Orders not yet picked up. */
  open: number
}

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { received: 'cooking', cooking: 'ready', ready: 'picked_up' }

export const nextStatus = (s: OrderStatus): OrderStatus | null => NEXT[s] ?? null

function countDishes(orders: readonly KitchenOrder[]): DishCount[] {
  const m = new Map<string, DishCount>()
  for (const o of orders)
    for (const i of o.items) {
      const c = m.get(i.menu_item_id)
      if (c) m.set(i.menu_item_id, { ...c, qty: c.qty + i.qty })
      else m.set(i.menu_item_id, { id: i.menu_item_id, name: i.menu_item?.name ?? i.menu_item_id, qty: i.qty })
    }
  return [...m.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
}

/** "9 hot chicken, 6 rice bowls, 4 tacos". */
export function batchLine(totals: readonly DishCount[]): string {
  return totals.map((t) => `${t.qty} ${dishWord(t.id, t.qty, t.name)}`).join(', ')
}

/**
 * Orders grouped by pickup window, earliest first; walk-ups (no window) lead because they are being
 * cooked now. Windows where every order is picked up are dropped unless `keepDone`.
 */
export function batchByWindow(orders: readonly KitchenOrder[], { keepDone = false } = {}): WindowBatch[] {
  const groups = new Map<string, KitchenOrder[]>()
  for (const o of orders) {
    const key = o.window?.id ?? 'walkup'
    groups.set(key, [...(groups.get(key) ?? []), o])
  }
  return [...groups.entries()]
    .map(([key, os]) => ({
      key,
      startsAt: os[0].window?.starts_at ?? null,
      endsAt: os[0].window?.ends_at ?? null,
      orders: [...os].sort((a, b) => a.pickup_number - b.pickup_number),
      totals: countDishes(os),
      open: os.filter((o) => o.status !== 'picked_up').length,
    }))
    .filter((b) => keepDone || b.open > 0)
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
}

export interface PrepRow extends DishCount {
  /** Still to start (status received). */
  toCook: number
}

/** Today's prep: every dish ordered today, and how many are still to start. */
export function prepTotals(orders: readonly KitchenOrder[]): PrepRow[] {
  const toCook = new Map(countDishes(orders.filter((o) => o.status === 'received')).map((d) => [d.id, d.qty]))
  return countDishes(orders).map((d) => ({ ...d, toCook: toCook.get(d.id) ?? 0 }))
}
