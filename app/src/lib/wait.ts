// Client mirror of compute_cart_wait. The server value (carts.live_wait_min) is authoritative.

/** Spec: no cart ever shows a wait over 10 minutes, whatever the admin setting says. */
export const HARD_MAX_WAIT_MIN = 10

export interface WaitInput {
  ordersAhead: number
  avgHandoffSec: number
  walkupLine: number
  avgWalkupServiceSec: number
}

/** (orders ahead x avg handoff + walk-up line x avg walk-up service) / 60, in minutes. */
export function computeWait({ ordersAhead, avgHandoffSec, walkupLine, avgWalkupServiceSec }: WaitInput): number {
  const sec = Math.max(0, ordersAhead) * avgHandoffSec + Math.max(0, walkupLine) * avgWalkupServiceSec
  return Math.max(0, sec / 60)
}

export type DisplayWait = { kind: 'minutes'; minutes: number } | { kind: 'full'; nextWindow: Date | null }

/** What a student may see. Anything over the max becomes "full, next window HH:MM". */
export function displayWait(
  min: number | null | undefined,
  maxWaitMin: number,
  nextWindowStart: string | Date | null | undefined,
): DisplayWait {
  const cap = Math.min(maxWaitMin, HARD_MAX_WAIT_MIN)
  const minutes = Math.ceil(Math.max(0, min ?? 0)) // round up: never understate a wait
  if (Number.isNaN(minutes) || minutes > cap) {
    return { kind: 'full', nextWindow: nextWindowStart ? new Date(nextWindowStart) : null }
  }
  return { kind: 'minutes', minutes }
}
