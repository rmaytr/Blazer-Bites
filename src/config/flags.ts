// Feature flags, read from the browser env (.env.local / hosting env).

export type PaymentMode = 'demo' | 'square'

export interface Flags {
  DRAGON_CASH_ENABLED: boolean
  BLAZERBUCKS_ENABLED: boolean
  LATE_NIGHT_ENABLED: boolean
  PAYMENT_MODE: PaymentMode
}

const on = (v: string | undefined): boolean => v === 'true' || v === '1'

export const FLAGS: Readonly<Flags> = Object.freeze({
  DRAGON_CASH_ENABLED: on(import.meta.env.VITE_DRAGON_CASH_ENABLED),
  BLAZERBUCKS_ENABLED: on(import.meta.env.VITE_BLAZERBUCKS_ENABLED),
  LATE_NIGHT_ENABLED: on(import.meta.env.VITE_LATE_NIGHT_ENABLED),
  PAYMENT_MODE: import.meta.env.VITE_PAYMENT_MODE === 'square' ? 'square' : 'demo',
})
