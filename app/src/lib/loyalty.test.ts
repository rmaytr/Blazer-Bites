import { describe, expect, it } from 'vitest'
import { applyLoyalty } from './loyalty'

describe('applyLoyalty', () => {
  it('charges full price without a reward', () => {
    expect(applyLoyalty([700, 500], 0)).toEqual({ subtotalCents: 1200, discountCents: 0, totalCents: 1200, loyaltyApplied: false })
  })
  it('makes the most expensive meal free when a reward is available', () => {
    expect(applyLoyalty([700, 800, 500], 1)).toEqual({ subtotalCents: 2000, discountCents: 800, totalCents: 1200, loyaltyApplied: true })
  })
  it('uses one reward per order', () => {
    expect(applyLoyalty([700, 700], 3).discountCents).toBe(700)
  })
  it('does nothing for an empty basket', () => {
    expect(applyLoyalty([], 2)).toEqual({ subtotalCents: 0, discountCents: 0, totalCents: 0, loyaltyApplied: false })
  })
})
