import { latency, placeOrder, toApiError } from '@/lib/api'
import type { PaymentMethod } from '@/types/app'
import type { PaymentProvider } from './types'

const DEMO_PAY_MS = 900

/** Demo payment: a short "processing" pause, then it always succeeds. No card is charged. */
export function demoProvider(id: PaymentMethod, label: string): PaymentProvider {
  return {
    id,
    label,
    isAvailable: () => true,
    async pay({ holdId, lines, guest }) {
      try {
        await new Promise((r) => setTimeout(r, import.meta.env.MODE === 'test' ? 0 : DEMO_PAY_MS))
        await latency()
        const order = await placeOrder({ holdId, lines, guest, paymentMethod: id, paymentRef: `demo-${holdId}` })
        return { ok: true, order }
      } catch (err) {
        return { ok: false, error: toApiError(err) }
      }
    },
  }
}
