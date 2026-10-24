import { describe, expect, it } from 'vitest'
import { getPaymentProviders } from './index'

const flags = { DRAGON_CASH_ENABLED: false, BLAZERBUCKS_ENABLED: false, LATE_NIGHT_ENABLED: false, PAYMENT_MODE: 'demo' as const }

describe('getPaymentProviders', () => {
  it('offers Apple Pay, Google Pay and Card by default', () => {
    expect(getPaymentProviders(flags).map((p) => p.id)).toEqual(['apple_pay', 'google_pay', 'card'])
  })
  it('adds Blazerbucks and Dragon Cash only when their flags are on', () => {
    const ids = getPaymentProviders({ ...flags, BLAZERBUCKS_ENABLED: true, DRAGON_CASH_ENABLED: true }).map((p) => p.id)
    expect(ids).toContain('blazerbucks')
    expect(ids).toContain('dragon_cash')
  })
})
