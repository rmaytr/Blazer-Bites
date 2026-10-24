// Typed, synchronous store actions. They validate like the archived RPCs did and throw ApiError
// with the same codes. src/lib/api.ts wraps them with artificial latency; controls.ts re-exports
// the demo/team ones for instant use.
import { RULES } from '@/config/rules'
import { canHold, nextOpenWindow } from '@/lib/capacity'
import { isValidPhone } from '@/lib/guest'
import { applyLoyalty } from '@/lib/loyalty'
import { ApiError } from '@/lib/apiError'
import type { BasketLine, GuestInfo, OrderStatus, OrderView, PaymentMethod, PlacedOrder, Profile, Quote } from '@/types/app'
import { orderRow } from './data'
import { commit, getState, resetDemo } from './store'
import type { DemoCart, DemoOrder, DemoState } from './types'
import { findByToken, orderView } from './views'

const MAX_QTY = 9
const MAX_WALKUP_LINE = 99
const STATUS_RANK: Record<OrderStatus, number> = { received: 0, cooking: 1, ready: 2, picked_up: 3, cancelled: 4 }
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = { received: 'cooking', cooking: 'ready', ready: 'picked_up' }

const newId = () => crypto.randomUUID()
const fail = (code: ConstructorParameters<typeof ApiError>[0], message: string): never => {
  throw new ApiError(code, message)
}

function cartOf(s: DemoState, cartId: string): DemoCart {
  return s.carts.find((c) => c.id === cartId) ?? fail('NOT_FOUND', `No cart ${cartId}`)
}

function orderOf(s: DemoState, orderId: string): DemoOrder {
  return s.orders.find((o) => o.id === orderId) ?? fail('NOT_FOUND', `No order ${orderId}`)
}

function byToken(s: DemoState, token: string): DemoOrder {
  return findByToken(s, token) ?? fail('NOT_FOUND', 'No order for that link')
}

const replace = <T extends { id: string }>(rows: readonly T[], id: string, patch: Partial<T>): T[] =>
  rows.map((r) => (r.id === id ? { ...r, ...patch } : r))

const bumpBooked = (s: DemoState, windowId: string | null, delta: number) =>
  s.windows.map((w) => (w.id === windowId ? { ...w, booked_count: Math.max(0, w.booked_count + delta) } : w))

/** Every line names an orderable dish this cart can sell right now. */
function checkLines(s: DemoState, cart: DemoCart | null, lines: readonly BasketLine[]): void {
  if (lines.length === 0) fail('INVALID_INPUT', 'The bag is empty')
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY) fail('INVALID_INPUT', `Quantity must be 1 to ${MAX_QTY}`)
    const m = s.menu.find((x) => x.id === l.menuItemId)
    if (!m || m.status !== 'active' || m.is_next_special) fail('NOT_FOUND', 'That dish is not on the menu')
    if (m!.variants.length > 0 && (!l.variant || !m!.variants.includes(l.variant))) fail('INVALID_INPUT', `Choose an option for ${m!.name}`)
    if (!cart) continue
    if (cart.sold_out_item_ids.includes(l.menuItemId)) fail('SOLD_OUT', `${m!.name} just sold out`)
    if (cart.surge && !m!.is_express) fail('NOT_EXPRESS', `${m!.name} is off the express menu while it's busy`)
  }
}

function quoteFor(s: DemoState, lines: readonly BasketLine[], asGuest: boolean): Quote {
  const units = lines.flatMap((l) => Array<number>(l.qty).fill(s.menu.find((m) => m.id === l.menuItemId)?.price_cents ?? 0))
  return applyLoyalty(units, asGuest ? 0 : s.loyalty.rewards_available)
}

function newOrder(s: DemoState, cart: DemoCart, p: Partial<DemoOrder>, lines: readonly BasketLine[], quote: Quote, now: Date) {
  const id = newId()
  const order = orderRow({
    id,
    cart_id: cart.id,
    pickup_number: cart.next_pickup_number,
    placed_at: now.toISOString(),
    subtotal_cents: quote.subtotalCents,
    discount_cents: quote.discountCents,
    total_cents: quote.totalCents,
    loyalty_applied: quote.loyaltyApplied,
    access_token: newId().replace(/-/g, ''),
    ...p,
  })
  const items = lines.map((l) => ({
    id: newId(),
    order_id: id,
    menu_item_id: l.menuItemId,
    variant: l.variant ?? null,
    qty: l.qty,
    unit_price_cents: s.menu.find((m) => m.id === l.menuItemId)?.price_cents ?? 0,
  }))
  const carts = replace(s.carts, cart.id, { next_pickup_number: cart.next_pickup_number + 1 })
  return { order, items, carts }
}

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

/** One hold per holder: holding a new window releases the holder's previous hold. */
function holdWindowSpot(windowId: string, holder: string, now: Date = new Date()): { holdId: string; expiresAt: string } {
  const s = getState()
  const w = s.windows.find((x) => x.id === windowId) ?? fail('NOT_FOUND', 'No such pickup window')
  if (!cartOf(s, w.cart_id).is_open) fail('CART_CLOSED', 'This cart is closed')
  if (new Date(w.ends_at).getTime() <= now.getTime()) fail('WINDOW_CLOSED', 'That pickup window has passed')
  const others = s.holds.filter((h) => h.holder !== holder)
  if (!canHold(w, others, now)) fail('WINDOW_FULL', 'That window just filled up')
  const hold = {
    id: newId(),
    window_id: w.id,
    holder,
    expires_at: new Date(now.getTime() + RULES.holdMin * 60_000).toISOString(),
    created_at: now.toISOString(),
  }
  commit({ ...s, holds: [...others, hold] }, now)
  return { holdId: hold.id, expiresAt: hold.expires_at }
}

function releaseHold(holdId: string): void {
  const s = getState()
  if (s.holds.some((h) => h.id === holdId)) commit({ ...s, holds: s.holds.filter((h) => h.id !== holdId) })
}

/** Price the bag. `asGuest` = no loyalty reward (guests have no punch card). */
function quoteOrder(lines: readonly BasketLine[], opts: { asGuest?: boolean } = {}): Quote {
  const s = getState()
  checkLines(s, null, lines)
  return quoteFor(s, lines, !!opts.asGuest)
}

export interface PlaceOrderInput {
  holdId: string
  lines: readonly BasketLine[]
  paymentMethod: PaymentMethod
  paymentRef?: string
  /** Present = "Order as guest": no account, no punches, no reward. */
  guest?: GuestInfo
}

function placeOrder({ holdId, lines, paymentMethod, paymentRef, guest }: PlaceOrderInput, now: Date = new Date()): PlacedOrder {
  const s = getState()
  const hold = s.holds.find((h) => h.id === holdId)
  if (!hold || new Date(hold.expires_at).getTime() <= now.getTime()) fail('HOLD_EXPIRED', 'Your held spot expired. Pick a time again.')
  const w = s.windows.find((x) => x.id === hold!.window_id) ?? fail('NOT_FOUND', 'No such pickup window')
  const cart = cartOf(s, w.cart_id)
  if (!cart.is_open) fail('CART_CLOSED', 'This cart is closed')
  if (new Date(w.ends_at).getTime() <= now.getTime()) fail('WINDOW_CLOSED', 'That pickup window has passed')
  if (w.booked_count >= w.capacity) fail('WINDOW_FULL', 'That window is full')
  checkLines(s, cart, lines)
  if (guest && (!guest.name.trim() || !isValidPhone(guest.phone))) fail('INVALID_INPUT', 'Add your name and a 10-digit phone number')
  if (paymentMethod === 'cash' || paymentMethod === 'walkup_card') fail('INVALID_INPUT', 'That payment method is for the register')

  const quote = quoteFor(s, lines, !!guest)
  const { order, items, carts } = newOrder(
    s,
    cart,
    {
      window_id: w.id,
      user_id: guest ? null : s.profile.id,
      guest_name: guest ? guest.name.trim() : null,
      guest_phone: guest ? guest.phone.replace(/\D/g, '') : null,
      payment_method: paymentMethod,
      payment_ref: paymentRef ?? null,
      auto: 'user',
      mine: true,
    },
    lines,
    quote,
    now,
  )

  const meals = lines.reduce((n, l) => n + l.qty, 0)
  const punches = s.loyalty.punches + meals
  const loyalty = guest
    ? s.loyalty
    : {
        ...s.loyalty,
        punches: punches % RULES.loyaltyEvery,
        rewards_available: s.loyalty.rewards_available - (quote.loyaltyApplied ? 1 : 0) + Math.floor(punches / RULES.loyaltyEvery),
        lifetime_meals: s.loyalty.lifetime_meals + meals,
      }

  commit(
    {
      ...s,
      carts,
      windows: bumpBooked(s, w.id, 1),
      holds: s.holds.filter((h) => h.id !== holdId),
      orders: [...s.orders, order],
      orderItems: [...s.orderItems, ...items],
      loyalty,
    },
    now,
  )
  return { orderId: order.id, pickupNumber: order.pickup_number, accessToken: order.access_token, totalCents: order.total_cents }
}

function getOrderByToken(token: string): OrderView | null {
  const s = getState()
  const o = findByToken(s, token)
  return o ? orderView(s, o) : null
}

export interface RatingInput {
  token: string
  orderItemId: string
  stars: number
  tags?: string[]
  comment?: string
}

function submitRating({ token, orderItemId, stars, tags = [], comment }: RatingInput, now: Date = new Date()): void {
  const s = getState()
  const o = byToken(s, token)
  const line = s.orderItems.find((i) => i.id === orderItemId && i.order_id === o.id) ?? fail('NOT_FOUND', 'No such dish on this order')
  if (o.status !== 'picked_up') fail('NOT_PICKED_UP', 'Rate it after you pick it up')
  if (s.ratings.some((r) => r.order_item_id === orderItemId)) fail('ALREADY_RATED', 'You already rated this dish')
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) fail('INVALID_INPUT', 'Pick 1 to 5 stars')
  const rating = {
    id: newId(),
    order_item_id: orderItemId,
    stars,
    tags,
    comment: comment?.trim() || null,
    created_at: now.toISOString(),
    is_sample: false,
  }
  const menu = s.menu.map((m) => {
    if (m.id !== line.menu_item_id) return m
    const count = m.rating_count + 1
    return { ...m, rating_count: count, avg_rating: ((m.avg_rating ?? 0) * m.rating_count + stars) / count }
  })
  commit({ ...s, ratings: [...s.ratings, rating], menu }, now)
}

/** "Running late?": move to the next open window at the same cart, once per order. */
function moveOrderLate(token: string, now: Date = new Date()): { newWindowId: string; startsAt: string } {
  const s = getState()
  const o = byToken(s, token)
  if (o.moved_late) fail('ALREADY_MOVED', 'This order was already moved once')
  if (o.status === 'picked_up' || o.status === 'cancelled') fail('INVALID_INPUT', 'This order is finished')
  const current = s.windows.find((w) => w.id === o.window_id)
  const after = s.windows.filter((w) => w.cart_id === o.cart_id && (!current || w.starts_at > current.starts_at))
  const next = nextOpenWindow(after, s.holds, now) ?? fail('WINDOW_FULL', 'No later window has room today')
  commit(
    {
      ...s,
      windows: bumpBooked({ ...s, windows: bumpBooked(s, o.window_id, -1) }, next.id, 1),
      orders: replace(s.orders, o.id, { window_id: next.id, original_window_id: o.window_id, moved_late: true }),
    },
    now,
  )
  return { newWindowId: next.id, startsAt: next.starts_at }
}

function markHere(token: string, now: Date = new Date()): void {
  const s = getState()
  const o = byToken(s, token)
  if (!o.arrived_at) commit({ ...s, orders: replace(s.orders, o.id, { arrived_at: now.toISOString() }) }, now)
}

// ---------------------------------------------------------------------------
// Team (kitchen / demo controls)
// ---------------------------------------------------------------------------

function placeWalkupOrder(
  cartId: string,
  lines: readonly BasketLine[],
  paymentMethod: PaymentMethod,
  now: Date = new Date(),
): { orderId: string; pickupNumber: number } {
  const s = getState()
  const cart = cartOf(s, cartId)
  if (!cart.is_open) fail('CART_CLOSED', 'This cart is closed')
  checkLines(s, cart, lines)
  const { order, items, carts } = newOrder(
    s,
    cart,
    { channel: 'walk_up', payment_method: paymentMethod, arrived_at: now.toISOString(), guest_name: 'Walk-up' },
    lines,
    quoteFor(s, lines, true),
    now,
  )
  commit({ ...s, carts, orders: [...s.orders, order], orderItems: [...s.orderItems, ...items] }, now)
  return { orderId: order.id, pickupNumber: order.pickup_number }
}

/** Move an order forward (or cancel it). Stops its timer: a manual move always wins. */
function advanceOrderStatus(orderId: string, status: OrderStatus, now: Date = new Date()): void {
  const s = getState()
  const o = orderOf(s, orderId)
  if (o.status === 'picked_up' || o.status === 'cancelled') fail('INVALID_INPUT', 'This order is finished')
  if (STATUS_RANK[status] <= STATUS_RANK[o.status]) fail('INVALID_INPUT', `Order is already ${o.status}`)
  const at = now.toISOString()
  const patch: Partial<DemoOrder> = { status, auto: null }
  if (status === 'cancelled') {
    commit({ ...s, windows: bumpBooked(s, o.window_id, -1), orders: replace(s.orders, o.id, patch) }, now)
    return
  }
  if (STATUS_RANK[status] >= 1) patch.cooking_at = o.cooking_at ?? at
  if (STATUS_RANK[status] >= 2) patch.ready_at = o.ready_at ?? at
  if (status === 'picked_up') {
    patch.arrived_at = o.arrived_at ?? at
    patch.picked_up_at = at
  }
  commit({ ...s, orders: replace(s.orders, o.id, patch) }, now)
}

/** Received → Cooking → Ready → Picked up, one step. */
function advanceOrder(orderId: string, now: Date = new Date()): OrderStatus {
  const o = orderOf(getState(), orderId)
  const next = NEXT_STATUS[o.status] ?? fail('INVALID_INPUT', 'This order is finished')
  advanceOrderStatus(orderId, next, now)
  return next
}

/** Hand the order over (from any open status). */
function markPickedUp(orderId: string, now: Date = new Date()): void {
  const o = orderOf(getState(), orderId)
  if (o.status === 'picked_up') return
  advanceOrderStatus(orderId, 'picked_up', now)
}

/** findOrderForHandoff: `code` is an access token (from the QR) or a pickup number. */
function findOrderForHandoff(cartId: string, code: string): OrderView | null {
  const s = getState()
  const c = code.trim()
  const o = s.orders.find((x) => x.cart_id === cartId && (x.access_token === c || String(x.pickup_number) === c) && x.status !== 'cancelled')
  return o ? orderView(s, o) : null
}

function patchCart(cartId: string, patch: (c: DemoCart) => Partial<DemoCart>): DemoCart {
  const s = getState()
  const c = cartOf(s, cartId)
  commit({ ...s, carts: replace(s.carts, cartId, patch(c)) })
  return cartOf(getState(), cartId)
}

function setWalkupLine(cartId: string, delta: number): number {
  return patchCart(cartId, (c) => ({ walkup_line: Math.min(MAX_WALKUP_LINE, Math.max(0, c.walkup_line + Math.round(delta))) })).walkup_line
}

function setItemSoldOut(cartId: string, itemId: string, on: boolean): void {
  patchCart(cartId, (c) => ({
    sold_out_item_ids: on ? [...new Set([...c.sold_out_item_ids, itemId])] : c.sold_out_item_ids.filter((i) => i !== itemId),
  }))
}

/** Express menu on/off ("simulate rush"). */
function setCartSurge(cartId: string, on: boolean): void {
  patchCart(cartId, () => ({ surge: on, surge_alert: false }))
}

function openCart(cartId: string): void {
  patchCart(cartId, () => ({ is_open: true }))
}

function closeCart(cartId: string): void {
  patchCart(cartId, () => ({ is_open: false, surge: false }))
}

function setAutoAdvance(on: boolean): void {
  const s = getState()
  commit({ ...s, settings: { ...s.settings, autoAdvance: on } })
}

export type ProfilePatch = Partial<
  Pick<Profile, 'display_name' | 'phone' | 'allergen_prefs' | 'favorite_item_ids' | 'class_gaps' | 'notify_ready' | 'notify_reminder'>
>

function updateProfile(patch: ProfilePatch): void {
  const s = getState()
  commit({ ...s, profile: { ...s.profile, ...patch } })
}

export const actions = {
  holdWindowSpot,
  releaseHold,
  quoteOrder,
  placeOrder,
  getOrderByToken,
  submitRating,
  moveOrderLate,
  markHere,
  placeWalkupOrder,
  advanceOrderStatus,
  advanceOrder,
  markPickedUp,
  findOrderForHandoff,
  setWalkupLine,
  setItemSoldOut,
  setCartSurge,
  openCart,
  closeCart,
  setAutoAdvance,
  updateProfile,
  resetDemo: (): void => {
    resetDemo()
  },
} as const

export type DemoActions = typeof actions
