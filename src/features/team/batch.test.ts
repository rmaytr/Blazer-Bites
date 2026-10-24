import { describe, expect, it } from 'vitest'
import { MENU_IDS } from '@/demo/data'
import type { KitchenOrder, OrderStatus } from '@/types/app'
import { batchByWindow, batchLine, nextStatus, prepTotals } from './batch'

const W1 = { id: 'w1', starts_at: '2026-10-23T16:40:00Z', ends_at: '2026-10-23T16:50:00Z' }
const W2 = { id: 'w2', starts_at: '2026-10-23T16:50:00Z', ends_at: '2026-10-23T17:00:00Z' }

function order(n: number, status: OrderStatus, window: typeof W1 | null, lines: [string, number][]): KitchenOrder {
  return {
    id: `o${n}`,
    pickup_number: n,
    status,
    window,
    items: lines.map(([id, qty], k) => ({ id: `o${n}-${k}`, menu_item_id: id, qty, menu_item: { id, name: id, photo_url: null, price_cents: 700 } })),
  } as unknown as KitchenOrder
}

describe('batchByWindow', () => {
  const orders = [
    order(103, 'received', W2, [[MENU_IDS.tacos, 1]]),
    order(101, 'cooking', W1, [[MENU_IDS.hotChicken, 2], [MENU_IDS.riceBowl, 1]]),
    order(102, 'received', W1, [[MENU_IDS.hotChicken, 1], [MENU_IDS.tacos, 1]]),
    order(104, 'picked_up', null, [[MENU_IDS.riceBowl, 1]]),
    order(105, 'received', null, [[MENU_IDS.riceBowl, 1]]),
  ]

  it('groups by window, walk-ups first, with totals that add up to the orders', () => {
    const b = batchByWindow(orders)
    expect(b.map((x) => x.key)).toEqual(['walkup', 'w1', 'w2'])
    const w1 = b[1]
    expect(w1.orders.map((o) => o.pickup_number)).toEqual([101, 102])
    expect(w1.open).toBe(2)
    expect(batchLine(w1.totals)).toBe('3 hot chicken, 1 rice bowl, 1 tacos')
    const items = (bs: typeof b) => bs.flatMap((x) => x.orders).flatMap((o) => o.items).reduce((s, i) => s + i.qty, 0)
    expect(b.flatMap((x) => x.totals).reduce((s, t) => s + t.qty, 0)).toBe(items(b))
  })

  it('drops windows where everything is picked up unless asked to keep them', () => {
    const done = [order(110, 'picked_up', W1, [[MENU_IDS.tacos, 1]])]
    expect(batchByWindow(done)).toEqual([])
    expect(batchByWindow(done, { keepDone: true })).toHaveLength(1)
  })

  it('counts prep totals and what is still to start', () => {
    const p = prepTotals(orders)
    const rice = p.find((r) => r.id === MENU_IDS.riceBowl)!
    expect(rice.qty).toBe(3)
    expect(rice.toCook).toBe(1)
  })

  it('steps the status one at a time and stops at picked up', () => {
    expect(nextStatus('received')).toBe('cooking')
    expect(nextStatus('ready')).toBe('picked_up')
    expect(nextStatus('picked_up')).toBeNull()
  })
})
