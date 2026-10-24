// The in-browser demo store: one immutable state object, persisted to localStorage, with
// time-driven updates (hold expiry, order auto-advance, crowd hand-offs, rolling windows).
// Read it with getState()/subscribe() (hooks use useSyncExternalStore); change it with the
// actions in actions.ts, which all go through commit().
import { RULES } from '@/config/rules'
import { nextOpenWindow } from '@/lib/capacity'
import { startOfCampusDay } from '@/lib/time'
import { computeWait } from '@/lib/wait'
import type { PickupWindow } from '@/types/app'
import { DEMO_VERSION, fillCrowd, makeWindows, seedState } from './data'
import type { DemoCart, DemoOrder, DemoState } from './types'

export type { DemoState, DemoOrder, DemoCart, DemoSettings } from './types'

export const STORAGE_KEY = 'bb-demo-v1'
const TICK_MS = 1_000

/** Auto-advance for the student's own orders, from placed_at. */
export const AUTO_COOKING_MS = 8_000
export const AUTO_READY_MS = 25_000
/** Crowd orders start cooking this long before their window. */
const CROWD_COOK_LEAD_MS = 4 * 60_000
const CROWD_READY_LEAD_MS = 45_000
const CROWD_ARRIVE_LEAD_MS = 90_000

type Listener = () => void

/** Loaded on first read (localStorage or the seed). */
let state: DemoState | null = null
const listeners = new Set<Listener>()
let timer: ReturnType<typeof setInterval> | undefined

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function isState(v: unknown): v is DemoState {
  const s = v as Partial<DemoState> | null
  return (
    !!s &&
    s.version === DEMO_VERSION &&
    typeof s.seededAt === 'string' &&
    [s.spots, s.carts, s.menu, s.windows, s.holds, s.orders, s.orderItems, s.ratings].every(Array.isArray) &&
    !!s.loyalty &&
    !!s.profile &&
    !!s.settings
  )
}

function readStored(): DemoState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isState(parsed) ? parsed : null
  } catch {
    return null // corrupt blob or blocked storage: start from the seed
  }
}

function load(now: Date): DemoState {
  const stored = readStored()
  // A state seeded on an earlier campus day is stale (windows, class gap): start the day fresh.
  const fresh = stored && new Date(stored.seededAt) >= startOfCampusDay(now) ? stored : seedState(now)
  return settle(fresh, now)
}

function save(s: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // storage full or blocked: the demo still works in memory for this tab
  }
}

// ---------------------------------------------------------------------------
// Time-driven settling. Each step returns its input unchanged when nothing moved.
// ---------------------------------------------------------------------------

const iso = (ms: number) => new Date(ms).toISOString()

function advanceUserOrder(o: DemoOrder, now: number): DemoOrder {
  const placed = new Date(o.placed_at).getTime()
  if (o.status === 'received' && now >= placed + AUTO_COOKING_MS) {
    o = { ...o, status: 'cooking', cooking_at: iso(placed + AUTO_COOKING_MS) }
  }
  if (o.status === 'cooking' && now >= placed + AUTO_READY_MS) {
    o = { ...o, status: 'ready', ready_at: iso(placed + AUTO_READY_MS) }
  }
  return o
}

function advanceCrowdOrder(o: DemoOrder, windowStart: number, now: number): DemoOrder {
  const due = o.due_at ? new Date(o.due_at).getTime() : windowStart
  if (o.status === 'received' && now >= windowStart - CROWD_COOK_LEAD_MS) {
    o = { ...o, status: 'cooking', cooking_at: iso(windowStart - CROWD_COOK_LEAD_MS) }
  }
  if (o.status === 'cooking' && now >= due - CROWD_READY_LEAD_MS) {
    o = { ...o, status: 'ready', ready_at: iso(due - CROWD_READY_LEAD_MS) }
  }
  if (o.status === 'ready' && now >= due) {
    o = { ...o, status: 'picked_up', arrived_at: o.arrived_at ?? iso(due - CROWD_ARRIVE_LEAD_MS), picked_up_at: iso(due) }
  }
  return o
}

function advanceOrders(s: DemoState, now: number): DemoOrder[] {
  const windowStart = new Map(s.windows.map((w) => [w.id, new Date(w.starts_at).getTime()]))
  let changed = false
  const orders = s.orders.map((o) => {
    let next = o
    if (o.auto === 'user' && s.settings.autoAdvance) next = advanceUserOrder(o, now)
    else if (o.auto === 'crowd' && o.window_id) next = advanceCrowdOrder(o, windowStart.get(o.window_id) ?? now, now)
    if (next !== o) changed = true
    return next
  })
  return changed ? orders : s.orders
}

/** Keep WINDOW_HORIZON_MIN of windows ahead at every open cart, each new one with its crowd orders. */
function topUpWindows(s: DemoState, now: Date): Pick<DemoState, 'windows' | 'orders' | 'orderItems' | 'carts'> {
  const have = new Set(s.windows.map((w) => w.id))
  const missing = makeWindows(now, s.carts, false).filter((w) => !have.has(w.id))
  if (missing.length === 0) return s
  const crowd = fillCrowd(s.carts, missing)
  return {
    windows: [...s.windows, ...missing],
    orders: [...s.orders, ...crowd.orders],
    orderItems: [...s.orderItems, ...crowd.items],
    carts: crowd.carts,
  }
}

const WAITING = new Set(['received', 'cooking', 'ready'])
const round2 = (n: number) => Math.round(n * 100) / 100

/** live_wait_min, orders_ahead, next_window_start: the same rule as the archived compute_cart_wait. */
function recomputeCarts(s: DemoState, now: Date): DemoCart[] {
  const t = now.getTime()
  const dayStart = startOfCampusDay(now).getTime()
  const started = new Set(
    s.windows
      .filter((w) => {
        const st = new Date(w.starts_at).getTime()
        return st >= dayStart && st <= t
      })
      .map((w) => w.id),
  )
  const byCart = new Map<string, PickupWindow[]>()
  for (const w of s.windows) {
    if (new Date(w.ends_at).getTime() > t) byCart.set(w.cart_id, [...(byCart.get(w.cart_id) ?? []), w])
  }
  let changed = false
  const carts = s.carts.map((c) => {
    const ordersAhead = s.orders.filter((o) => o.cart_id === c.id && o.window_id && started.has(o.window_id) && WAITING.has(o.status)).length
    const wait = round2(
      computeWait({
        ordersAhead,
        avgHandoffSec: c.avg_handoff_sec ?? RULES.defaultHandoffSec,
        walkupLine: c.walkup_line,
        avgWalkupServiceSec: RULES.avgWalkupServiceSec,
      }),
    )
    const next = c.is_open ? (nextOpenWindow(byCart.get(c.id) ?? [], s.holds, now)?.starts_at ?? null) : null
    if (c.orders_ahead === ordersAhead && c.live_wait_min === wait && c.next_window_start === next) return c
    changed = true
    return { ...c, orders_ahead: ordersAhead, live_wait_min: wait, next_window_start: next, updated_at: now.toISOString() }
  })
  return changed ? carts : s.carts
}

/** Apply everything time does to a state. Returns `s` itself when nothing changed. */
export function settle(s: DemoState, now: Date = new Date()): DemoState {
  const t = now.getTime()
  const holds = s.holds.some((h) => new Date(h.expires_at).getTime() <= t)
    ? s.holds.filter((h) => new Date(h.expires_at).getTime() > t)
    : s.holds
  const orders = advanceOrders(s, t)
  const topped = topUpWindows({ ...s, orders }, now)
  const base: DemoState =
    holds === s.holds && orders === s.orders && topped.windows === s.windows ? s : { ...s, holds, ...topped, orders: topped.orders }
  const carts = recomputeCarts(base, now)
  return carts === base.carts ? base : { ...base, carts }
}

// ---------------------------------------------------------------------------
// Public store API
// ---------------------------------------------------------------------------

export function getState(): DemoState {
  state ??= load(new Date())
  return state
}

function emit(): void {
  for (const l of listeners) l()
}

/** Replace the state (already changed by an action), settle it, persist and notify. */
export function commit(next: DemoState, now: Date = new Date()): DemoState {
  const settled = settle(next, now)
  state = settled
  save(settled)
  emit()
  return settled
}

/** Advance time-driven state; notifies only if something changed. The store calls it every second while subscribed. */
export function tick(now: Date = new Date()): void {
  const current = getState()
  const next = settle(current, now)
  if (next === current) return
  state = next
  save(state)
  emit()
}

function onStorage(e: StorageEvent): void {
  if (e.key !== STORAGE_KEY) return
  const stored = readStored()
  if (!stored) return
  state = settle(stored)
  emit()
}

/** Listen for changes (and keep the clock ticking while anyone listens). Returns the unsubscribe. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    timer = setInterval(() => tick(), TICK_MS)
    window.addEventListener('storage', onStorage) // another tab (e.g. Team view) changed the demo
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearInterval(timer)
      window.removeEventListener('storage', onStorage)
    }
  }
}

/** Throw away every change and start from the seed (new windows relative to now). */
export function resetDemo(now: Date = new Date()): DemoState {
  return commit(seedState(now), now)
}
