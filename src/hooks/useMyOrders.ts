import { myOrders } from '@/demo/views'
import { useDemoQuery, type QueryState } from './useDemo'
import type { OrderWithItems } from '@/types/app'

/** Orders placed on this device (the demo student's, incl. guest checkouts), newest first, live. */
export function useMyOrders(): QueryState<OrderWithItems[]> {
  return useDemoQuery((s) => myOrders(s), [])
}
