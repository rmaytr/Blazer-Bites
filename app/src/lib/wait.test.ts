import { describe, expect, it } from 'vitest'
import { computeWait, displayWait } from './wait'

describe('computeWait', () => {
  it('adds pre-order handoffs and the walk-up line, in minutes', () => {
    // 6 orders x 30s = 180s, 3 walk-ups x 40s = 120s -> 5 min
    expect(computeWait({ ordersAhead: 6, avgHandoffSec: 30, walkupLine: 3, avgWalkupServiceSec: 40 })).toBe(5)
  })
  it('is zero for an empty cart', () => {
    expect(computeWait({ ordersAhead: 0, avgHandoffSec: 30, walkupLine: 0, avgWalkupServiceSec: 40 })).toBe(0)
  })
  it('never goes negative on bad input', () => {
    expect(computeWait({ ordersAhead: -3, avgHandoffSec: 30, walkupLine: -1, avgWalkupServiceSec: 40 })).toBe(0)
  })
})

describe('displayWait', () => {
  const next = '2026-10-23T17:20:00Z'

  it('shows minutes, rounded up', () => {
    expect(displayWait(4.2, 10, next)).toEqual({ kind: 'minutes', minutes: 5 })
  })
  it('shows exactly the max as minutes', () => {
    expect(displayWait(10, 10, next)).toEqual({ kind: 'minutes', minutes: 10 })
  })
  it('turns anything over the max into full with the next window', () => {
    expect(displayWait(10.1, 10, next)).toEqual({ kind: 'full', nextWindow: new Date(next) })
    expect(displayWait(42, 10, next)).toEqual({ kind: 'full', nextWindow: new Date(next) })
  })
  it('reports full with no next window when there is none', () => {
    expect(displayWait(20, 10, null)).toEqual({ kind: 'full', nextWindow: null })
  })
  it('never shows more than 10 minutes even if the setting is raised', () => {
    expect(displayWait(14, 20, next).kind).toBe('full')
  })
  it('treats an unknown wait as no wait and infinity as full', () => {
    expect(displayWait(null, 10, next)).toEqual({ kind: 'minutes', minutes: 0 })
    expect(displayWait(Number.POSITIVE_INFINITY, 10, next).kind).toBe('full')
  })
  it('never returns more than 10 minutes across a sweep', () => {
    for (let m = 0; m <= 60; m += 0.25) {
      const w = displayWait(m, 10, next)
      if (w.kind === 'minutes') expect(w.minutes).toBeLessThanOrEqual(10)
    }
  })
})
