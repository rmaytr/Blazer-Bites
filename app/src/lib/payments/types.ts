import type { ApiError } from '@/lib/api'
import type { BasketLine, GuestInfo, PaymentMethod, PlacedOrder } from '@/types/app'

export interface PayInput {
  holdId: string
  lines: readonly BasketLine[]
  guest?: GuestInfo
  totalCents: number
}

export type PayResult = { ok: true; order: PlacedOrder } | { ok: false; error: ApiError }

export interface PaymentProvider {
  /** The payment_method recorded on the order. */
  id: PaymentMethod
  label: string
  /** e.g. Apple Pay only on Safari with a card in the wallet. */
  isAvailable(): boolean | Promise<boolean>
  /** Render provider UI (a card form) into the element; return a cleanup if needed. */
  mount?(el: HTMLElement): void | (() => void) | Promise<void | (() => void)>
  pay(input: PayInput): Promise<PayResult>
}
