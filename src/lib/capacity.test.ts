import { describe, expect, it } from 'vitest'
import { canHold, nextOpenWindow, spotsLeft } from './capacity'

const now = new Date('2026-10-23T16:00:00Z')
const win = (id: string, startMin: number, capacity: number, booked: number) => ({
  id,
  capacity,
  booked_count: booked,
  starts_at: new Date(now.getTime() + startMin * 60_000).toISOString(),
  ends_at: new Date(now.getTime() + (startMin + 10) * 60_000).toISOString(),
})
const hold = (windowId: string, expiresInMin: number) => ({
  window_id: windowId,
  expires_at: new Date(now.getTime() + expiresInMin * 60_000).toISOString(),
})

describe('spotsLeft', () => {
  it('is capacity minus booked', () => {
    expect(spotsLeft(win('a', 10, 25, 20), [], now)).toBe(5)
  })
  it('subtracts only active holds for that window', () => {
    const holds = [hold('a', 3), hold('a', -1), hold('b', 3)]
    expect(spotsLeft(win('a', 10, 25, 20), holds, now)).toBe(4)
  })
  it('never goes below zero', () => {
    expect(spotsLeft(win('a', 10, 25, 25), [hold('a', 2)], now)).toBe(0)
  })
})

describe('canHold', () => {
  it('allows the last spot', () => {
    expect(canHold(win('a', 10, 25, 24), [], now)).toBe(true)
  })
  it('refuses a full window', () => {
    expect(canHold(win('a', 10, 25, 25), [], now)).toBe(false)
  })
  it('refuses the last spot when someone else holds it', () => {
    expect(canHold(win('a', 10, 25, 24), [hold('a', 4)], now)).toBe(false)
  })
  it('frees the last spot once the other hold expires', () => {
    expect(canHold(win('a', 10, 25, 24), [hold('a', -0.1)], now)).toBe(true)
  })
  it('treats a hold expiring exactly now as expired', () => {
    expect(canHold(win('a', 10, 25, 24), [hold('a', 0)], now)).toBe(true)
  })
  it('refuses a window that has already ended', () => {
    expect(canHold(win('a', -20, 25, 0), [], now)).toBe(false)
  })
})

describe('nextOpenWindow', () => {
  it('skips full and past windows and returns the earliest open one', () => {
    const windows = [win('late', 30, 25, 0), win('past', -20, 25, 0), win('full', 10, 25, 25), win('open', 20, 25, 3)]
    expect(nextOpenWindow(windows, [], now)?.id).toBe('open')
  })
  it('returns null when every window is full', () => {
    expect(nextOpenWindow([win('a', 10, 1, 1), win('b', 20, 1, 0)], [hold('b', 4)], now)).toBeNull()
  })
})
