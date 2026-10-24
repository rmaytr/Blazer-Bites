import { describe, expect, it } from 'vitest'
import { basketReducer } from './useBasket'

const empty = { cartId: null, lines: [], hold: null }

describe('basketReducer', () => {
  it('merges the same dish and variant', () => {
    let s = basketReducer(empty, { type: 'add', cartId: 'c1', line: { menuItemId: 'm1', variant: 'tofu', qty: 1 } })
    s = basketReducer(s, { type: 'add', cartId: 'c1', line: { menuItemId: 'm1', variant: 'tofu', qty: 2 } })
    s = basketReducer(s, { type: 'add', cartId: 'c1', line: { menuItemId: 'm1', variant: 'chicken', qty: 1 } })
    expect(s.lines).toEqual([
      { menuItemId: 'm1', variant: 'tofu', qty: 3 },
      { menuItemId: 'm1', variant: 'chicken', qty: 1 },
    ])
  })
  it('starts over when adding from another cart, dropping the hold', () => {
    const s1 = { cartId: 'c1', lines: [{ menuItemId: 'm1', qty: 1 }], hold: { id: 'h', windowId: 'w', expiresAt: 'x' } }
    const s2 = basketReducer(s1, { type: 'add', cartId: 'c2', line: { menuItemId: 'm2', qty: 1 } })
    expect(s2).toEqual({ cartId: 'c2', lines: [{ menuItemId: 'm2', qty: 1 }], hold: null })
  })
  it('removes a line when its quantity is set to zero', () => {
    const s = basketReducer({ cartId: 'c1', lines: [{ menuItemId: 'm1', qty: 2 }], hold: null }, { type: 'setQty', menuItemId: 'm1', qty: 0 })
    expect(s.lines).toEqual([])
  })
  it('does not mutate the previous state', () => {
    const s1 = { cartId: 'c1', lines: [{ menuItemId: 'm1', qty: 1 }], hold: null }
    basketReducer(s1, { type: 'add', cartId: 'c1', line: { menuItemId: 'm1', qty: 1 } })
    expect(s1.lines[0].qty).toBe(1)
  })
})
