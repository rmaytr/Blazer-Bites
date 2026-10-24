import { toCartWithSpot } from '@/demo/views'
import { useDemoQuery } from './useDemo'
import type { CartWithSpot, MenuItem } from '@/types/app'

export interface MenuData {
  /** What can be ordered right now at this cart (sold-out removed; express only during surge). */
  items: MenuItem[]
  /** The whole launch menu (active, not next week's), incl. sold-out and non-express, for greyed-out rows. */
  all: MenuItem[]
  /** "Coming next week". */
  nextSpecial: MenuItem | null
  surge: boolean
  cart: CartWithSpot | null
}

/** The menu for a cart, live (surge and sold-out toggles apply instantly). */
export function useMenu(cartId: string | undefined): { data: MenuData | undefined; loading: boolean; error: Error | null } {
  const q = useDemoQuery<MenuData>(
    (s) => {
      const c = s.carts.find((x) => x.id === cartId)
      const cart = c ? toCartWithSpot(s, c) : null
      const soldOut = new Set(cart?.sold_out_item_ids ?? [])
      const surge = cart?.surge ?? false
      const all = s.menu.filter((i) => i.status === 'active' && !i.is_next_special)
      return {
        items: all.filter((i) => !soldOut.has(i.id) && (!surge || i.is_express)),
        all,
        nextSpecial: s.menu.find((i) => i.is_next_special) ?? null,
        surge,
        cart,
      }
    },
    [cartId],
  )
  return { data: q.data, loading: q.loading, error: q.error }
}
