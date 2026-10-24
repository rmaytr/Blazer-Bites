import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/apiError'
import { HARD_MAX_WAIT_MIN } from '@/lib/wait'
import { actions } from './actions'
import { CART_IDS, MENU_IDS } from './data'
import { AUTO_COOKING_MS, AUTO_READY_MS, getState, resetDemo, tick, STORAGE_KEY } from './store'
import { windowsFor } from './views'

const NOW = new Date('2026-10-23T16:33:00Z') // 11:33 AM campus time

const code = (fn: () => unknown): string => {
  try {
    fn()
  } catch (e) {
    return e instanceof ApiError ? e.code : 'NOT_API_ERROR'
  }
  return 'NO_ERROR'
}

const firstOpenWindow = (cartId: string) => windowsFor(getState(), cartId, NOW).find((w) => !w.is_full)!

const chicken = [{ menuItemId: MENU_IDS.hotChicken, qty: 1 }]

function placeAt(cartId: string = CART_IDS.sterne) {
  const w = firstOpenWindow(cartId)
  const { holdId } = actions.holdWindowSpot(w.id, 'me', NOW)
  return actions.placeOrder({ holdId, lines: chicken, paymentMethod: 'apple_pay' }, NOW)
}

describe('demo store', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo(NOW)
  })

  it('seeds 4 carts with Medical closed and windows from the next 10-minute mark', () => {
    const s = getState()
    expect(s.carts.map((c) => [c.id, c.is_open])).toEqual([
      [CART_IDS.sterne, true],
      [CART_IDS.campus, true],
      [CART_IDS.bizeng, true],
      [CART_IDS.medical, false],
    ])
    const ws = windowsFor(s, CART_IDS.sterne, NOW)
    expect(ws[0].starts_at).toBe('2026-10-23T16:40:00.000Z')
    expect(ws).toHaveLength(12)
    expect(windowsFor(s, CART_IDS.medical, NOW)).toEqual([])
  })

  it('has exactly one full window, at the busiest cart, and booked counts match the kitchen orders', () => {
    const s = getState()
    const today = s.windows.filter((w) => w.starts_at >= NOW.toISOString())
    const full = today.filter((w) => w.booked_count >= w.capacity)
    expect(full.map((w) => w.cart_id)).toEqual([CART_IDS.campus])
    for (const w of today) expect(s.orders.filter((o) => o.window_id === w.id)).toHaveLength(w.booked_count)
  })

  it('never computes a cart wait the student would see over the cap at seed', () => {
    for (const c of getState().carts) expect(Math.ceil(c.live_wait_min)).toBeLessThanOrEqual(HARD_MAX_WAIT_MIN)
  })

  it('placing an order consumes the hold and bumps booked_count', () => {
    const w = firstOpenWindow(CART_IDS.sterne)
    const { holdId } = actions.holdWindowSpot(w.id, 'me', NOW)
    expect(getState().holds).toHaveLength(1)
    expect(windowsFor(getState(), CART_IDS.sterne, NOW)[0].spots_left).toBe(w.spots_left - 1)

    const placed = actions.placeOrder({ holdId, lines: chicken, paymentMethod: 'apple_pay' }, NOW)
    const s = getState()
    expect(s.holds).toHaveLength(0)
    expect(s.windows.find((x) => x.id === w.id)!.booked_count).toBe(w.booked_count + 1)
    expect(placed.totalCents).toBe(700)
    expect(placed.pickupNumber).toBeGreaterThanOrEqual(101)
    expect(actions.getOrderByToken(placed.accessToken)?.status).toBe('received')
    expect(s.loyalty.punches).toBe(8)
  })

  it('a used or expired hold cannot place an order', () => {
    const w = firstOpenWindow(CART_IDS.sterne)
    const { holdId } = actions.holdWindowSpot(w.id, 'me', NOW)
    const later = new Date(NOW.getTime() + 6 * 60_000)
    expect(code(() => actions.placeOrder({ holdId, lines: chicken, paymentMethod: 'card' }, later))).toBe('HOLD_EXPIRED')
  })

  it('holding a full window throws WINDOW_FULL, including when the last spot is already held', () => {
    const full = getState().windows.find((w) => w.booked_count >= w.capacity)!
    expect(code(() => actions.holdWindowSpot(full.id, 'me', NOW))).toBe('WINDOW_FULL')

    const w = firstOpenWindow(CART_IDS.bizeng)
    for (let i = 0; i < w.spots_left; i++) actions.holdWindowSpot(w.id, `other-${i}`, NOW)
    expect(code(() => actions.holdWindowSpot(w.id, 'me', NOW))).toBe('WINDOW_FULL')
  })

  it('surge: a non-express dish is refused with NOT_EXPRESS, express dishes still go through', () => {
    actions.setCartSurge(CART_IDS.sterne, true)
    const w = firstOpenWindow(CART_IDS.sterne)
    const { holdId } = actions.holdWindowSpot(w.id, 'me', NOW)
    const bowl = [{ menuItemId: MENU_IDS.riceBowl, variant: 'Tofu', qty: 1 }]
    expect(code(() => actions.placeOrder({ holdId, lines: bowl, paymentMethod: 'card' }, NOW))).toBe('NOT_EXPRESS')
    expect(code(() => actions.placeOrder({ holdId, lines: chicken, paymentMethod: 'card' }, NOW))).toBe('NO_ERROR')
  })

  it('sold-out dishes are refused with SOLD_OUT', () => {
    actions.setItemSoldOut(CART_IDS.sterne, MENU_IDS.hotChicken, true)
    expect(code(() => placeAt())).toBe('SOLD_OUT')
  })

  it('auto-advances the order by timestamps: Cooking after ~8 s, Ready after ~25 s', () => {
    const placed = placeAt()
    const status = () => actions.getOrderByToken(placed.accessToken)?.status
    tick(new Date(NOW.getTime() + AUTO_COOKING_MS - 1))
    expect(status()).toBe('received')
    tick(new Date(NOW.getTime() + AUTO_COOKING_MS))
    expect(status()).toBe('cooking')
    tick(new Date(NOW.getTime() + AUTO_READY_MS + 5_000))
    expect(status()).toBe('ready')
    expect(actions.getOrderByToken(placed.accessToken)?.ready_at).toBe(new Date(NOW.getTime() + AUTO_READY_MS).toISOString())
  })

  it('a manual move stops the timer; auto-advance can be switched off', () => {
    const a = placeAt()
    actions.advanceOrder(a.orderId, NOW) // cooking by hand
    tick(new Date(NOW.getTime() + AUTO_READY_MS + 1_000))
    expect(actions.getOrderByToken(a.accessToken)?.status).toBe('cooking')

    actions.setAutoAdvance(false)
    const b = placeAt()
    tick(new Date(NOW.getTime() + AUTO_READY_MS + 1_000))
    expect(actions.getOrderByToken(b.accessToken)?.status).toBe('received')
  })

  it('rating needs a picked-up order and only once per dish', () => {
    const placed = placeAt()
    const itemId = actions.getOrderByToken(placed.accessToken)!.items[0].id
    expect(code(() => actions.submitRating({ token: placed.accessToken, orderItemId: itemId, stars: 5 }))).toBe('NOT_PICKED_UP')
    actions.markPickedUp(placed.orderId, NOW)
    actions.submitRating({ token: placed.accessToken, orderItemId: itemId, stars: 5, tags: ['perfect'] })
    expect(code(() => actions.submitRating({ token: placed.accessToken, orderItemId: itemId, stars: 4 }))).toBe('ALREADY_RATED')
  })

  it('running late moves the order once', () => {
    const placed = placeAt()
    const before = actions.getOrderByToken(placed.accessToken)!.window_starts_at!
    const moved = actions.moveOrderLate(placed.accessToken, NOW)
    expect(moved.startsAt > before).toBe(true)
    expect(code(() => actions.moveOrderLate(placed.accessToken, NOW))).toBe('ALREADY_MOVED')
  })

  it('walk-up line changes move the live wait', () => {
    const before = getState().carts.find((c) => c.id === CART_IDS.bizeng)!.live_wait_min
    actions.setWalkupLine(CART_IDS.bizeng, 4)
    expect(getState().carts.find((c) => c.id === CART_IDS.bizeng)!.live_wait_min).toBeGreaterThan(before)
  })

  it('persists to localStorage and resetDemo restores the seed', () => {
    const seeded = JSON.stringify(getState().carts)
    placeAt()
    actions.setCartSurge(CART_IDS.sterne, true)
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"surge":true')
    resetDemo(NOW)
    expect(JSON.stringify(getState().carts)).toBe(seeded)
    expect(getState().orders.filter((o) => o.mine)).toHaveLength(4)
  })
})
