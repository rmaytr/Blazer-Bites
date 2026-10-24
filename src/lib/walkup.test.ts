import { describe, expect, it } from 'vitest'
import { shouldStopWalkups } from './walkup'

describe('shouldStopWalkups', () => {
  it('keeps walk-ups going at exactly 15 people and 10 minutes', () => {
    expect(shouldStopWalkups({ walkupLine: 15, waitMin: 10 })).toBe(false)
  })
  it('stops when the line passes 15', () => {
    expect(shouldStopWalkups({ walkupLine: 16, waitMin: 2 })).toBe(true)
  })
  it('stops when the wait passes 10 minutes', () => {
    expect(shouldStopWalkups({ walkupLine: 3, waitMin: 10.5 })).toBe(true)
  })
  it('honours custom limits', () => {
    expect(shouldStopWalkups({ walkupLine: 9, waitMin: 1 }, 8, 10)).toBe(true)
  })
})
