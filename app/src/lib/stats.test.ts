import { describe, expect, it } from 'vitest'
import { median, p90 } from './stats'

describe('median', () => {
  it('handles odd and even lengths without sorting the input in place', () => {
    const xs = [5, 1, 3]
    expect(median(xs)).toBe(3)
    expect(xs).toEqual([5, 1, 3])
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })
  it('is null for no values', () => {
    expect(median([])).toBeNull()
  })
})

describe('p90', () => {
  it('interpolates like percentile_cont', () => {
    expect(p90([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBeCloseTo(9.1)
    expect(p90([7])).toBe(7)
  })
  it('is null for no values', () => {
    expect(p90([])).toBeNull()
  })
})
