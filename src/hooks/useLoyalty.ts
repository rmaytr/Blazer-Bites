import { RULES } from '@/config/rules'
import { myOrders } from '@/demo/views'
import { useDemoQuery, type QueryState } from './useDemo'
import type { LoyaltyCard } from '@/types/app'

export interface LoyaltyView extends LoyaltyCard {
  /** Punches per free meal (10). */
  every: number
  /** Punches still needed for the next free meal. */
  toNext: number
  /** Recent punched orders, newest first: one punch per meal on each account order. */
  recent: { orderId: string; placedAt: string; cartName: string; meals: number }[]
}

const RECENT = 5

/** The demo student's punch card, live (placing an order adds punches; a reward is used automatically). */
export function useLoyalty(): QueryState<LoyaltyView> {
  return useDemoQuery((s) => {
    const recent = myOrders(s)
      .filter((o) => o.user_id === s.profile.id && o.status !== 'cancelled')
      .slice(0, RECENT)
      .map((o) => ({ orderId: o.id, placedAt: o.placed_at, cartName: o.cart_name, meals: o.items.reduce((n, i) => n + i.qty, 0) }))
    return { ...s.loyalty, every: RULES.loyaltyEvery, toNext: RULES.loyaltyEvery - s.loyalty.punches, recent }
  }, [])
}
