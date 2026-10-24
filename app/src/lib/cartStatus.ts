import { RULES } from '@/config/rules'

export type CartStatus = 'open' | 'busy' | 'express' | 'closed'

export interface CartStatusInput {
  is_open: boolean
  surge: boolean
  live_wait_min: number | null
}

/** Closed beats express beats busy (wait over the surge trigger) beats open. */
export function cartStatus(cart: CartStatusInput, busyOverMin: number = RULES.surgeTriggerMin): CartStatus {
  if (!cart.is_open) return 'closed'
  if (cart.surge) return 'express'
  if ((cart.live_wait_min ?? 0) > busyOverMin) return 'busy'
  return 'open'
}
