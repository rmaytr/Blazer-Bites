import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from './api'

describe('toApiError', () => {
  it('maps a raised Postgres exception message to its code', () => {
    const e = toApiError({ message: 'WINDOW_FULL', code: 'P0001' })
    expect(e).toBeInstanceOf(ApiError)
    expect(e.code).toBe('WINDOW_FULL')
  })
  it('finds the code inside a longer message or the details', () => {
    expect(toApiError({ message: 'error: HOLD_EXPIRED: hold 123 is gone' }).code).toBe('HOLD_EXPIRED')
    expect(toApiError({ message: 'raise', details: 'SOLD_OUT' }).code).toBe('SOLD_OUT')
  })
  it('maps permission errors to FORBIDDEN', () => {
    expect(toApiError({ message: 'permission denied for function open_cart', code: '42501' }).code).toBe('FORBIDDEN')
  })
  it('falls back to UNKNOWN and keeps the message', () => {
    const e = toApiError(new Error('fetch failed'))
    expect(e.code).toBe('UNKNOWN')
    expect(e.message).toBe('fetch failed')
  })
  it('passes an ApiError through untouched', () => {
    const original = new ApiError('CART_CLOSED', 'closed')
    expect(toApiError(original)).toBe(original)
  })
})
