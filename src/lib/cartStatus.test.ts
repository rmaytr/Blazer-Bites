import { describe, expect, it } from 'vitest'
import { cartStatus } from './cartStatus'

const base = { is_open: true, surge: false, live_wait_min: 2 }

describe('cartStatus', () => {
  it('is closed when not open, whatever else is set', () => {
    expect(cartStatus({ ...base, is_open: false, surge: true })).toBe('closed')
  })
  it('is express while surge is on', () => {
    expect(cartStatus({ ...base, surge: true })).toBe('express')
  })
  it('is busy when the wait runs over the surge trigger', () => {
    expect(cartStatus({ ...base, live_wait_min: 6.5 })).toBe('busy')
    expect(cartStatus({ ...base, live_wait_min: 6 })).toBe('open')
  })
  it('is open otherwise, including an unknown wait', () => {
    expect(cartStatus(base)).toBe('open')
    expect(cartStatus({ ...base, live_wait_min: null })).toBe('open')
  })
})
