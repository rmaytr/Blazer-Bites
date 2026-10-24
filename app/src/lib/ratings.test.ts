import { describe, expect, it } from 'vitest'
import { dishFlag, ratingsInWindow } from './ratings'

const now = new Date('2026-10-23T16:00:00Z')
const r = (stars: number, daysAgo: number) => ({
  stars,
  created_at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
})

describe('ratingsInWindow', () => {
  it('averages only ratings inside the last 14 days', () => {
    expect(ratingsInWindow([r(5, 1), r(3, 2), r(1, 15)], 14, now)).toEqual({ avg: 4, count: 2 })
  })
  it('returns a null average when there are none', () => {
    expect(ratingsInWindow([r(5, 30)], 14, now)).toEqual({ avg: null, count: 0 })
  })
})

describe('dishFlag', () => {
  it('flags a dish under 4.0 to cut', () => {
    expect(dishFlag({ avg: 3.7, count: 40, isSpecial: false })).toBe('cut')
  })
  it('does not flag exactly 4.0', () => {
    expect(dishFlag({ avg: 4.0, count: 40, isSpecial: false })).toBeNull()
  })
  it('promotes a special at exactly 4.3', () => {
    expect(dishFlag({ avg: 4.3, count: 12, isSpecial: true })).toBe('promote')
  })
  it('does not promote a special just under 4.3', () => {
    expect(dishFlag({ avg: 4.29, count: 12, isSpecial: true })).toBeNull()
  })
  it('does not promote a fixed menu item', () => {
    expect(dishFlag({ avg: 4.8, count: 40, isSpecial: false })).toBeNull()
  })
  it('does not flag with too few ratings in the window', () => {
    const stats = ratingsInWindow([r(1, 1), r(2, 3), r(1, 20), r(1, 25), r(1, 30)], 14, now)
    expect(stats.count).toBe(2)
    expect(dishFlag({ ...stats, isSpecial: false })).toBeNull()
  })
  it('flags a dish averaging 3.7 over 14 days of ratings', () => {
    const ratings = Array.from({ length: 30 }, (_, i) => r(i % 10 < 7 ? 4 : 3, i * 0.45))
    const stats = ratingsInWindow(ratings, 14, now)
    expect(stats.avg).toBeCloseTo(3.7, 1)
    expect(dishFlag({ ...stats, isSpecial: false })).toBe('cut')
  })
  it('returns null for no average', () => {
    expect(dishFlag({ avg: null, count: 0, isSpecial: true })).toBeNull()
  })
})
