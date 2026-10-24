// Read projections of the demo state into the shapes the app types describe.
import { FLAGS } from '@/config/flags'
import { spotsLeft } from '@/lib/capacity'
import { startOfCampusDay } from '@/lib/time'
import type { CartWithSpot, OrderLine, OrderView, OrderWithItems, WindowWithSpots } from '@/types/app'
import type { DemoCart, DemoOrder, DemoState } from './types'

/** A cart as the app sees it (internal counters stripped, spot joined). */
export function toCartWithSpot(s: DemoState, c: DemoCart): CartWithSpot {
  const { next_pickup_number: _n, ...cart } = c
  return { ...cart, spot: s.spots.find((p) => p.id === c.spot_id) ?? null }
}

export function cartsWithSpot(s: DemoState): CartWithSpot[] {
  return s.carts.map((c) => toCartWithSpot(s, c)).filter((c) => FLAGS.LATE_NIGHT_ENABLED || !c.spot?.is_late_night)
}

/** Today's windows that have not ended, earliest first, with spots left after live holds. */
export function windowsFor(s: DemoState, cartId: string, now: Date = new Date()): WindowWithSpots[] {
  const t = now.getTime()
  return s.windows
    .filter((w) => w.cart_id === cartId && new Date(w.ends_at).getTime() > t)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((w) => {
      const left = spotsLeft(w, s.holds, now)
      return { ...w, spots_left: left, is_full: left === 0 }
    })
}

function linesOf(s: DemoState, orderId: string): OrderLine[] {
  return s.orderItems
    .filter((i) => i.order_id === orderId)
    .map((i) => {
      const m = s.menu.find((x) => x.id === i.menu_item_id)
      const r = s.ratings.find((x) => x.order_item_id === i.id)
      return {
        ...i,
        menu_item: m ? { id: m.id, name: m.name, photo_url: m.photo_url, price_cents: m.price_cents } : null,
        rated: !!r,
        stars: r?.stars ?? null,
      }
    })
}

function customerName(s: DemoState, o: DemoOrder): string | null {
  if (o.guest_name) return o.guest_name
  return o.user_id === s.profile.id ? s.profile.display_name : null
}

/** Strip the store-only fields from an order row. */
function publicOrder(o: DemoOrder) {
  const { auto: _a, mine: _m, due_at: _d, ...order } = o
  return order
}

export function orderWithItems(s: DemoState, o: DemoOrder): OrderWithItems {
  const w = s.windows.find((x) => x.id === o.window_id)
  return {
    ...publicOrder(o),
    items: linesOf(s, o.id),
    cart_name: s.carts.find((c) => c.id === o.cart_id)?.name ?? '',
    customer_name: customerName(s, o),
    window: w ? { id: w.id, starts_at: w.starts_at, ends_at: w.ends_at } : null,
  }
}

export function orderView(s: DemoState, o: DemoOrder): OrderView {
  const w = s.windows.find((x) => x.id === o.window_id)
  const c = s.carts.find((x) => x.id === o.cart_id)
  return {
    id: o.id,
    cart_id: o.cart_id,
    window_id: o.window_id,
    original_window_id: o.original_window_id,
    moved_late: o.moved_late,
    status: o.status,
    pickup_number: o.pickup_number,
    channel: o.channel,
    payment_method: o.payment_method,
    subtotal_cents: o.subtotal_cents,
    discount_cents: o.discount_cents,
    total_cents: o.total_cents,
    loyalty_applied: o.loyalty_applied,
    access_token: o.access_token,
    placed_at: o.placed_at,
    cooking_at: o.cooking_at,
    ready_at: o.ready_at,
    arrived_at: o.arrived_at,
    picked_up_at: o.picked_up_at,
    cart_name: c?.name ?? '',
    spot_name: s.spots.find((p) => p.id === c?.spot_id)?.name ?? '',
    window_starts_at: w?.starts_at ?? null,
    window_ends_at: w?.ends_at ?? null,
    customer_name: customerName(s, o),
    items: linesOf(s, o.id).map((l) => ({
      id: l.id,
      menu_item_id: l.menu_item_id,
      variant: l.variant,
      qty: l.qty,
      unit_price_cents: l.unit_price_cents,
      name: l.menu_item?.name ?? '',
      photo_url: l.menu_item?.photo_url ?? null,
      rated: l.rated,
      stars: l.stars,
    })),
  }
}

export function findByToken(s: DemoState, token: string): DemoOrder | undefined {
  return s.orders.find((o) => o.access_token === token)
}

/** This device's orders, newest first. */
export function myOrders(s: DemoState): OrderWithItems[] {
  return s.orders
    .filter((o) => o.mine)
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at))
    .map((o) => orderWithItems(s, o))
}

/** Today's non-cancelled orders at a cart (app and walk-up), in placed order. */
export function kitchenOrders(s: DemoState, cartId: string, now: Date = new Date()): OrderWithItems[] {
  const day = startOfCampusDay(now).toISOString()
  const windowStart = new Map(s.windows.map((w) => [w.id, w.starts_at]))
  return s.orders
    .filter((o) => o.cart_id === cartId && o.status !== 'cancelled' && (windowStart.get(o.window_id ?? '') ?? o.placed_at) >= day)
    .sort((a, b) => a.placed_at.localeCompare(b.placed_at))
    .map((o) => orderWithItems(s, o))
}
