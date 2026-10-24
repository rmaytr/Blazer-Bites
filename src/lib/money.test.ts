import { describe, expect, it } from 'vitest'
import { formatCents } from './money'

describe('formatCents', () => {
  it('formats integer cents as dollars', () => {
    expect(formatCents(750)).toBe('$7.50')
    expect(formatCents(500)).toBe('$5.00')
    expect(formatCents(0)).toBe('$0.00')
    expect(formatCents(123456)).toBe('$1,234.56')
  })
  it('formats negatives for discounts', () => {
    expect(formatCents(-700)).toBe('-$7.00')
  })
})
