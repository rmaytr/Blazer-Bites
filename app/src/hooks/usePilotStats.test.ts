import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MENU_IDS } from '@/demo/data'
import { usePilotStats } from './usePilotStats'

describe('usePilotStats', () => {
  const { result } = renderHook(() => usePilotStats())
  const data = result.current.data!
  const dish = (id: string) => data.taste.find((d) => d.id === id)!

  it('flags the veggie wrap "Fix or cut" and shrimp & grits "Ready for the fixed menu"', () => {
    expect(dish(MENU_IDS.veggieWrap).flag).toBe('cut')
    expect(dish(MENU_IDS.veggieWrap).avg14!).toBeLessThan(4.0)
    expect(dish(MENU_IDS.shrimpGrits).flag).toBe('promote')
    expect(dish(MENU_IDS.shrimpGrits).avg14!).toBeGreaterThanOrEqual(4.3)
  })

  it('keeps the fixed menu between 4.3 and 4.8 with no flag', () => {
    for (const id of [MENU_IDS.hotChicken, MENU_IDS.riceBowl, MENU_IDS.tacos, MENU_IDS.fiveDollar]) {
      expect(dish(id).flag).toBeNull()
      expect(dish(id).avg14!).toBeGreaterThanOrEqual(4.3)
    }
  })

  it('computes time, price and viability from the rows', () => {
    expect(data.time.preorder.medianMin!).toBeGreaterThan(1.5)
    expect(data.time.preorder.medianMin!).toBeLessThan(2.5)
    expect(data.time.preorder.p90Min!).toBeLessThan(4)
    expect(data.time.walkup.medianMin!).toBeGreaterThan(4)
    expect(data.time.over10).toBeGreaterThan(0)
    expect(data.time.over10).toBeLessThan(20)
    expect(data.price.maxPriceCents).toBeLessThanOrEqual(800)
    expect(data.price.fiveDollarItem).toBe('$5 value item')
    for (const c of data.viability.perCart) {
      expect(c.ordersPerDay).toBeGreaterThanOrEqual(38)
      expect(c.ordersPerDay).toBeLessThanOrEqual(96)
    }
    expect(data.viability.repeatRate).toBeGreaterThan(0.3)
    expect(data.viability.repeatRate).toBeLessThan(0.5)
    expect(data.history.orders.length).toBe(data.orderCount)
  })
})
