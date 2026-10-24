import { describe, expect, it } from 'vitest'
import { atCampusTime, campusWeekday } from '@/demo/data'
import type { CartWithSpot, WindowWithSpots } from '@/types/app'
import { formatCountdown, formatDistance, gapClock, nextOpenWindow, quieterCart, soonestCart, suggestWindow } from './pickup'

const now = new Date('2026-10-23T16:00:00Z') // a Friday, 11:00 campus time

const cart = (id: string, next: string | null, wait: number, open = true) =>
  ({ id, is_open: open, next_window_start: next, live_wait_min: wait }) as CartWithSpot

const win = (hhmm: string, full = false) => {
  const s = atCampusTime(now, hhmm)
  return {
    id: hhmm,
    starts_at: s.toISOString(),
    ends_at: new Date(s.getTime() + 600_000).toISOString(),
    is_full: full,
    spots_left: full ? 0 : 5,
  } as WindowWithSpots
}

describe('soonestCart / quieterCart', () => {
  const carts = [cart('a', '2026-10-23T16:20:00Z', 1), cart('b', '2026-10-23T16:10:00Z', 6), cart('c', '2026-10-23T16:00:00Z', 0, false)]
  it('picks the open cart with the earliest window', () => expect(soonestCart(carts)?.id).toBe('b'))
  it('picks the shortest wait other than the current cart', () => expect(quieterCart(carts, 'a')?.id).toBe('b'))
  it('returns null when nothing is open', () => expect(soonestCart([cart('x', null, 0)])).toBeNull())
})

describe('suggestWindow', () => {
  const day = campusWeekday(now)
  it('finds the first open window starting inside a gap', () => {
    const ws = [win('11:40'), win('11:50', true), win('12:00'), win('12:10')]
    expect(suggestWindow(ws, [{ day, start: '11:50', end: '12:05' }], now)?.windowId).toBe('12:00')
  })
  it('ignores gaps on other days', () => {
    const other = day === 'mon' ? 'tue' : 'mon'
    expect(suggestWindow([win('11:50')], [{ day: other, start: '11:50', end: '12:05' }], now)).toBeNull()
  })
})

describe('formatting', () => {
  it('formats distance in feet or miles', () => {
    expect(formatDistance(100)).toBe('350 ft')
    expect(formatDistance(500)).toBe('0.3 mi')
  })
  it('formats countdowns and gap clocks', () => {
    expect(formatCountdown(300_000)).toBe('5:00')
    expect(formatCountdown(59_100)).toBe('1:00')
    expect(formatCountdown(-5)).toBe('0:00')
    expect(gapClock('13:05')).toBe('1:05')
  })
  it('finds the next open window after a full one', () => {
    expect(nextOpenWindow([win('11:40'), win('11:50', true), win('12:00')], '11:40')?.id).toBe('12:00')
  })
})
