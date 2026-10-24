import { cartsWithSpot, toCartWithSpot } from '@/demo/views'
import { useDemoQuery, type QueryState } from './useDemo'
import type { CartWithSpot } from '@/types/app'

/** All carts with their spot and tint, live (waits move as orders are placed and handed off). */
export function useCarts(): QueryState<CartWithSpot[]> {
  return useDemoQuery((s) => cartsWithSpot(s), [])
}

/** One cart with its spot, live; data null for an unknown id. */
export function useCart(cartId: string | undefined): QueryState<CartWithSpot | null> {
  return useDemoQuery(
    (s) => {
      const c = s.carts.find((x) => x.id === cartId)
      return c ? toCartWithSpot(s, c) : null
    },
    [cartId],
  )
}
