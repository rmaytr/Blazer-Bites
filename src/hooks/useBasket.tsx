import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { getState, subscribe } from '@/demo/store'
import type { BasketLine } from '@/types/app'

const STORAGE_KEY = 'bb:basket:v1'

export interface BasketHold {
  id: string
  windowId: string
  expiresAt: string
}

interface BasketState {
  cartId: string | null
  lines: BasketLine[]
  hold: BasketHold | null
}

type Action =
  | { type: 'add'; line: BasketLine; cartId: string }
  | { type: 'setQty'; menuItemId: string; variant?: string; qty: number }
  | { type: 'remove'; menuItemId: string; variant?: string }
  | { type: 'clear' }
  | { type: 'setHold'; hold: BasketHold | null }

const EMPTY: BasketState = { cartId: null, lines: [], hold: null }
const MAX_QTY = 9

const same = (l: BasketLine, menuItemId: string, variant?: string) =>
  l.menuItemId === menuItemId && (l.variant ?? null) === (variant ?? null)

export function basketReducer(state: BasketState, action: Action): BasketState {
  switch (action.type) {
    case 'add': {
      // A basket belongs to one cart: adding from another cart starts over.
      const base = state.cartId === action.cartId ? state : { ...EMPTY, cartId: action.cartId }
      const { menuItemId, variant, qty } = action.line
      const existing = base.lines.find((l) => same(l, menuItemId, variant))
      const lines = existing
        ? base.lines.map((l) => (l === existing ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l))
        : [...base.lines, { ...action.line, qty: Math.min(MAX_QTY, qty) }]
      return { ...base, lines }
    }
    case 'setQty': {
      const qty = Math.min(MAX_QTY, Math.max(0, Math.floor(action.qty)))
      const lines =
        qty === 0
          ? state.lines.filter((l) => !same(l, action.menuItemId, action.variant))
          : state.lines.map((l) => (same(l, action.menuItemId, action.variant) ? { ...l, qty } : l))
      return { ...state, lines }
    }
    case 'remove':
      return { ...state, lines: state.lines.filter((l) => !same(l, action.menuItemId, action.variant)) }
    case 'clear':
      return EMPTY
    case 'setHold':
      return { ...state, hold: action.hold }
  }
}

function load(): BasketState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const s = JSON.parse(raw) as Partial<BasketState>
    return { cartId: s.cartId ?? null, lines: Array.isArray(s.lines) ? s.lines : [], hold: s.hold ?? null }
  } catch {
    return EMPTY
  }
}

export interface Basket {
  cartId: string | null
  lines: BasketLine[]
  /** Total number of meals. */
  count: number
  hold: BasketHold | null
  holdId: string | null
  add: (line: BasketLine, cartId: string) => void
  setQty: (menuItemId: string, qty: number, variant?: string) => void
  remove: (menuItemId: string, variant?: string) => void
  clear: () => void
  setHold: (hold: BasketHold | null) => void
}

const BasketContext = createContext<Basket | null>(null)

export function BasketProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(basketReducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // not persisted; basket still works in memory
    }
  }, [state])

  // Reset demo empties the bag too.
  useEffect(() => {
    let seededAt = getState().seededAt
    return subscribe(() => {
      if (getState().seededAt === seededAt) return
      seededAt = getState().seededAt
      dispatch({ type: 'clear' })
    })
  }, [])

  const value = useMemo<Basket>(
    () => ({
      ...state,
      count: state.lines.reduce((n, l) => n + l.qty, 0),
      holdId: state.hold?.id ?? null,
      add: (line, cartId) => dispatch({ type: 'add', line, cartId }),
      setQty: (menuItemId, qty, variant) => dispatch({ type: 'setQty', menuItemId, qty, variant }),
      remove: (menuItemId, variant) => dispatch({ type: 'remove', menuItemId, variant }),
      clear: () => dispatch({ type: 'clear' }),
      setHold: (hold) => dispatch({ type: 'setHold', hold }),
    }),
    [state],
  )

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
}

export function useBasket(): Basket {
  const ctx = useContext(BasketContext)
  if (!ctx) throw new Error('useBasket must be used inside <BasketProvider>')
  return ctx
}
