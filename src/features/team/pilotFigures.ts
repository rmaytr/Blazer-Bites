// Pilot dashboard figures beyond usePilotStats(): tags, food cost per dish, capped windows, the time
// targets and the finding. Computed from the same sample rows, so the screen and the exports agree.
import { RULES } from '@/config/rules'
import type { PilotData } from '@/hooks'
import type { RatingTag } from '@/types/app'
import { dishTitle } from './batch'

export const TARGET_WALKUP_MIN = 6
export const TARGET_CHEAP_SHARE = 0.6
export const TARGET_FOOD_COST = 0.3
export const TARGET_REPEAT = 0.4

const WINDOW_MS = RULES.windowMin * 60_000

export const TAG_LABEL: Record<RatingTag, string> = {
  perfect: 'Perfect',
  order_again: 'Would order again',
  too_salty: 'Too salty',
  cold: 'Cold',
  small_portion: 'Small portion',
}

export interface DishExtra {
  topTags: { tag: RatingTag; count: number }[]
  /** Plate cost / price over the dish's meals sold (0–1), or null if none sold. */
  foodCostPct: number | null
}

export interface PilotFigures {
  dishes: Record<string, DishExtra>
  /** Pre-order windows (cart × day × 10 min) whose app orders reached the per-window cap. */
  windowsAtCap: number
  windowCount: number
  cap: number
  /** True when time misses a target: walk-up p90 over 6 min, any wait over 10, or a capped window. */
  needsCapacity: boolean
  finding: string
}

function topTags(data: PilotData, dishId: string): DishExtra['topTags'] {
  // The sample history is exactly the 14-day window, so every row counts.
  const counts = new Map<RatingTag, number>()
  for (const r of data.history.ratings) if (r.menu_item_id === dishId) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
}

function foodCost(data: PilotData, dishId: string): number | null {
  let price = 0
  let cost = 0
  for (const o of data.history.orders)
    for (const i of o.items)
      if (i.menu_item_id === dishId) {
        price += i.unit_price_cents * i.qty
        cost += i.plate_cost_cents * i.qty
      }
  return price > 0 ? cost / price : null
}

function cappedWindows(data: PilotData): { atCap: number; total: number } {
  const perWindow = new Map<string, number>()
  for (const o of data.history.orders) {
    if (o.channel !== 'app') continue
    // shortcut: history rows carry no window id, so the window is the 10-min slot the customer arrived in.
    const slot = Math.floor(new Date(o.arrived_at).getTime() / WINDOW_MS)
    const key = `${o.cart_id}:${slot}`
    perWindow.set(key, (perWindow.get(key) ?? 0) + 1)
  }
  const atCap = [...perWindow.values()].filter((n) => n >= RULES.ordersPerWindow).length
  return { atCap, total: perWindow.size }
}

function findingLine(data: PilotData): string {
  const name = (d: PilotData['taste'][number]) => dishTitle(d.id, d.name.replace(/^Sample:\s*/, ''))
  const promote = data.taste.filter((d) => d.flag === 'promote').map(name)
  const cut = data.taste.filter((d) => d.flag === 'cut').map(name)
  const parts = [
    promote.length ? `${promote.join(' and ')} ${promote.length > 1 ? 'are' : 'is'} ready for the fixed menu` : '',
    cut.length ? `${cut.join(' and ')} ${cut.length > 1 ? 'need' : 'needs'} a fix or cut` : '',
  ].filter(Boolean)
  return parts.length ? `${parts.join('; ')}.` : 'Every dish is within its rating targets.'
}

export function pilotFigures(data: PilotData): PilotFigures {
  const dishes = Object.fromEntries(data.taste.map((d) => [d.id, { topTags: topTags(data, d.id), foodCostPct: foodCost(data, d.id) }]))
  const { atCap, total } = cappedWindows(data)
  const walkP90 = data.time.walkup.p90Min ?? 0
  return {
    dishes,
    windowsAtCap: atCap,
    windowCount: total,
    cap: RULES.ordersPerWindow,
    needsCapacity: walkP90 > TARGET_WALKUP_MIN || data.time.over10 > 0 || atCap > 0,
    finding: findingLine(data),
  }
}
