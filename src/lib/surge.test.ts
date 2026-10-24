import { describe, expect, it } from 'vitest'
import { shouldSurge } from './surge'

describe('shouldSurge', () => {
  it('triggers when the last two windows both ran over 6 minutes', () => {
    expect(shouldSurge([3, 6.5, 7], 6, 2)).toBe(true)
  })
  it('does not trigger at exactly the threshold', () => {
    expect(shouldSurge([6, 6], 6, 2)).toBe(false)
    expect(shouldSurge([6.01, 6], 6, 2)).toBe(false)
  })
  it('needs the windows to be in a row', () => {
    expect(shouldSurge([7, 3, 7], 6, 2)).toBe(false)
  })
  it('does not trigger with fewer windows than required', () => {
    expect(shouldSurge([9], 6, 2)).toBe(false)
    expect(shouldSurge([], 6, 2)).toBe(false)
  })
  it('uses the rules defaults', () => {
    expect(shouldSurge([6.1, 6.1])).toBe(true)
  })
})
