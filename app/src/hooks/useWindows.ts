import { windowsFor } from '@/demo/views'
import { useDemoQuery, type QueryState } from './useDemo'
import type { WindowWithSpots } from '@/types/app'

/** Today's remaining pickup windows for a cart, earliest first, with spots left after holds. Live. */
export function useWindows(cartId: string | undefined): QueryState<WindowWithSpots[]> {
  return useDemoQuery((s) => (cartId ? windowsFor(s, cartId) : []), [cartId])
}
