import { FLAGS, type Flags } from '@/config/flags'
import { demoProvider } from './demo'
import type { PaymentProvider } from './types'

export type { PaymentProvider, PayInput, PayResult } from './types'
export { demoProvider } from './demo'

// Frontend demo: every method is a demo provider that succeeds after a short spinner.
const PROVIDERS: PaymentProvider[] = [
  demoProvider('apple_pay', 'Apple Pay'),
  demoProvider('google_pay', 'Google Pay'),
  demoProvider('card', 'Card'),
  demoProvider('blazerbucks', 'Blazerbucks'),
  demoProvider('dragon_cash', 'Dragon Cash'),
]

function allowed(p: PaymentProvider, flags: Flags): boolean {
  if (p.id === 'blazerbucks') return flags.BLAZERBUCKS_ENABLED
  if (p.id === 'dragon_cash') return flags.DRAGON_CASH_ENABLED
  return true
}

/** Checkout methods permitted by the flags, in display order. */
export function getPaymentProviders(flags: Flags = FLAGS): PaymentProvider[] {
  return PROVIDERS.filter((p) => allowed(p, flags))
}
