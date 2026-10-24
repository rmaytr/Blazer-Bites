import { QrCode, toast } from '@/components/ui'
import { setWalkupLine } from '@/demo/controls'
import { RULES } from '@/config/rules'
import { shouldStopWalkups } from '@/lib/walkup'
import type { CartWithSpot } from '@/types/app'

/** "At 15 people or 10 min": shouldStopWalkups() is strict (passes the cutoff), so shift each bar by one. */
export function walkupsStopped(cart: CartWithSpot): boolean {
  return shouldStopWalkups(
    { walkupLine: cart.walkup_line, waitMin: Math.ceil(cart.live_wait_min) },
    RULES.walkupCutoff - 1,
    RULES.maxWaitMin - 1,
  )
}

function change(cartId: string, delta: number) {
  try {
    setWalkupLine(cartId, delta)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Couldn't update the line")
  }
}

const STEP = 'grid size-14 flex-none place-items-center rounded-full bg-raised text-2xl font-bold transition-transform active:scale-95 motion-reduce:active:scale-100 disabled:opacity-50'

export function WalkupCounter({ cart }: { cart: CartWithSpot }) {
  return (
    <div>
      <h2 className="text-base font-semibold">Walk-up line</h2>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" className={STEP} aria-label="One fewer in line" disabled={cart.walkup_line === 0} onClick={() => change(cart.id, -1)}>
          −
        </button>
        <p className="flex-1 text-center" aria-live="polite">
          <span className="num block text-4xl leading-none font-bold">{cart.walkup_line}</span>
          <span className="text-[13px] text-muted">people · stop at {RULES.walkupCutoff}</span>
        </p>
        <button type="button" className={STEP} aria-label="One more in line" onClick={() => change(cart.id, 1)}>
          +
        </button>
      </div>
      <p className="num mt-2 text-[13px] text-muted">
        Wait now {Math.ceil(cart.live_wait_min)} min · stop at {RULES.maxWaitMin}
      </p>
    </div>
  )
}

/** Full-width state: tell the line to pre-order instead, with a code to scan. */
export function StopWalkups({ cart }: { cart: CartWithSpot }) {
  const url = `${window.location.origin}/order/time`
  return (
    <section role="alert" aria-labelledby="stop-walkups" className="mb-4 flex flex-col items-center gap-4 rounded-card bg-danger-bg p-5 text-danger-ink sm:flex-row sm:p-6">
      <div className="min-w-0 flex-1">
        <h2 id="stop-walkups" className="text-3xl font-bold">
          Stop walk-ups
        </h2>
        <p className="num mt-2 text-lg">
          {cart.walkup_line} in line · {Math.ceil(cart.live_wait_min)} min wait. Point the line at the code: they pick a pickup time and skip the queue.
        </p>
        <p className="mt-2 text-[15px] break-all">{url}</p>
      </div>
      <QrCode value={url} label="QR code to pre-order a pickup time" size={168} />
    </section>
  )
}
