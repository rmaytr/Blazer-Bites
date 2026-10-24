import { findByToken, orderView } from '@/demo/views'
import { useDemoQuery, type QueryState } from './useDemo'
import type { OrderView } from '@/types/app'

/** An order by its access token, live (status advances on its own in the demo). null if unknown. */
export function useOrderByToken(token: string | undefined): QueryState<OrderView | null> {
  return useDemoQuery(
    (s) => {
      const o = token ? findByToken(s, token) : undefined
      return o ? orderView(s, o) : null
    },
    [token],
  )
}
