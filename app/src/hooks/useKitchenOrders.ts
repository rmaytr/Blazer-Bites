import { kitchenOrders } from '@/demo/views'
import { useDemoQuery, type QueryState } from './useDemo'
import type { KitchenOrder } from '@/types/app'

/** Today's non-cancelled orders for a cart (all statuses, app + walk-up), with lines and window. Live. */
export function useKitchenOrders(cartId: string | undefined): QueryState<KitchenOrder[]> {
  return useDemoQuery((s) => (cartId ? kitchenOrders(s, cartId) : []), [cartId])
}
