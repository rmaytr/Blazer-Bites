// The app's data API. Same names and error codes as the archived Supabase RPC wrappers, now backed
// by the in-browser demo store (src/demo). Every call waits 150–350 ms so loading states show.
import { actions, type PlaceOrderInput, type RatingInput } from '@/demo/actions'
import type { BasketLine, OrderStatus, OrderView, PaymentMethod, PlacedOrder, Quote } from '@/types/app'

export { API_ERROR_CODES, ApiError, toApiError, type ApiErrorCode } from './apiError'
export type { PlaceOrderInput, RatingInput } from '@/demo/actions'

const LATENCY_MS: readonly [number, number] = import.meta.env.MODE === 'test' ? [0, 0] : [150, 350]

/** Artificial network delay. */
export function latency(): Promise<void> {
  const [min, max] = LATENCY_MS
  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)))
}

/** Run a store action after the delay; ApiErrors reject the promise. */
async function call<T>(fn: () => T): Promise<T> {
  await latency()
  return fn()
}

// Student

export const holdWindowSpot = (windowId: string, holder: string): Promise<{ holdId: string; expiresAt: string }> =>
  call(() => actions.holdWindowSpot(windowId, holder))

export const releaseHold = (holdId: string): Promise<void> => call(() => actions.releaseHold(holdId))

export const quoteOrder = (lines: readonly BasketLine[], opts?: { asGuest?: boolean }): Promise<Quote> =>
  call(() => actions.quoteOrder(lines, opts))

export const placeOrder = (input: PlaceOrderInput): Promise<PlacedOrder> => call(() => actions.placeOrder(input))

export const getOrderByToken = (token: string): Promise<OrderView | null> => call(() => actions.getOrderByToken(token))

export const submitRating = (input: RatingInput): Promise<void> => call(() => actions.submitRating(input))

export const moveOrderLate = (token: string): Promise<{ newWindowId: string; startsAt: string }> =>
  call(() => actions.moveOrderLate(token))

export const markHere = (token: string): Promise<void> => call(() => actions.markHere(token))

// Team

export const placeWalkupOrder = (
  cartId: string,
  lines: readonly BasketLine[],
  paymentMethod: PaymentMethod,
): Promise<{ orderId: string; pickupNumber: number }> => call(() => actions.placeWalkupOrder(cartId, lines, paymentMethod))

export const advanceOrderStatus = (orderId: string, status: OrderStatus): Promise<void> =>
  call(() => actions.advanceOrderStatus(orderId, status))

/** `code` is an access token (from the QR) or a pickup number. */
export const findOrderForHandoff = (cartId: string, code: string): Promise<OrderView | null> =>
  call(() => actions.findOrderForHandoff(cartId, code))

export const markPickedUp = (orderId: string): Promise<void> => call(() => actions.markPickedUp(orderId))

export const setWalkupLine = (cartId: string, delta: number): Promise<number> => call(() => actions.setWalkupLine(cartId, delta))

export const setItemSoldOut = (cartId: string, itemId: string, on: boolean): Promise<void> =>
  call(() => actions.setItemSoldOut(cartId, itemId, on))

export const setCartSurge = (cartId: string, on: boolean): Promise<void> => call(() => actions.setCartSurge(cartId, on))

export const openCart = (cartId: string): Promise<void> => call(() => actions.openCart(cartId))

export const closeCart = (cartId: string): Promise<void> => call(() => actions.closeCart(cartId))
