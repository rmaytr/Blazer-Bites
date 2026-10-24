// Pickup time: pick a 10-minute window; picking places a 5-minute hold (docs/spec.md, screen 3).
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, buttonClasses, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { useBasket } from '@/hooks/useBasket'
import { useCarts } from '@/hooks/useCarts'
import { useSession } from '@/hooks/useSession'
import { useWindows } from '@/hooks/useWindows'
import { holdWindowSpot, toApiError } from '@/lib/api'
import { getDeviceId } from '@/lib/guest'
import { formatTime } from '@/lib/time'
import type { WindowWithSpots } from '@/types/app'
import { errorCopy } from '@/features/order/errors'
import { useHoldLeft, useSwitchCart } from '@/features/order/hooks'
import { HoldCard, WindowScroller } from '@/features/order/PickupParts'
import { nextOpenWindow, quieterCart, suggestWindow } from '@/features/order/pickup'
import { WaitText } from '@/features/order/WaitText'

type Problem = { kind: 'full'; window: WindowWithSpots } | { kind: 'error'; text: string } | { kind: 'expired' }

export default function PickupTime() {
  const navigate = useNavigate()
  const basket = useBasket()
  const switchCart = useSwitchCart()
  const { profile } = useSession()
  const { data: carts } = useCarts()
  const { data: windows, loading } = useWindows(basket.cartId ?? undefined)
  const leftMs = useHoldLeft()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)

  const cart = carts?.find((c) => c.id === basket.cartId) ?? null
  const held = basket.hold && leftMs ? (windows?.find((w) => w.id === basket.hold!.windowId) ?? null) : null
  const suggestion = windows ? suggestWindow(windows, profile.class_gaps) : null

  // The hold ran out while the student was looking: say so and free the picker.
  useEffect(() => {
    if (basket.hold && leftMs === 0) {
      basket.setHold(null)
      setProblem({ kind: 'expired' })
    }
  }, [basket, leftMs])

  const pick = async (w: WindowWithSpots) => {
    if (pendingId || w.id === held?.id) return
    if (w.is_full) return setProblem({ kind: 'full', window: w })
    setPendingId(w.id)
    try {
      const { holdId, expiresAt } = await holdWindowSpot(w.id, getDeviceId())
      basket.setHold({ id: holdId, windowId: w.id, expiresAt })
      setProblem(null)
    } catch (e) {
      const err = toApiError(e)
      setProblem(err.code === 'WINDOW_FULL' ? { kind: 'full', window: w } : { kind: 'error', text: errorCopy(err).text })
    } finally {
      setPendingId(null)
    }
  }

  if (basket.lines.length === 0) {
    return (
      <>
        <PageHeader title="Pickup time" back="/order" />
        <EmptyState title="Your bag is empty" body="Add something first, then pick when to collect it." action={<Link to="/order" className={buttonClasses('primary')}>See the menu</Link>} />
      </>
    )
  }

  const next = problem?.kind === 'full' && windows ? nextOpenWindow(windows, problem.window.id) : null
  const quieter = carts ? quieterCart(carts, basket.cartId) : null

  return (
    <>
      <PageHeader title="Pickup time" subtitle={cart ? `${cart.name} · ${cart.spot?.name ?? ''}` : undefined} back="/order" />

      {loading || !windows ? (
        <div className="flex gap-2" aria-busy="true" aria-label="Loading pickup times">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] w-[84px] flex-none" />
          ))}
        </div>
      ) : windows.length === 0 ? (
        <EmptyState title="No more pickups here today" body="Try another cart, or come back tomorrow." action={<Link to="/order" className={buttonClasses('secondary')}>Choose another cart</Link>} />
      ) : (
        <>
          <p className="mb-3 text-[15px] text-muted">Pick a 10-minute window. We hold your spot for 5 minutes.</p>
          <WindowScroller windows={windows} selectedId={held?.id ?? null} pendingId={pendingId} suggestion={suggestion} onPick={pick} />
        </>
      )}

      <div aria-live="polite" className="mt-4 space-y-4">
        {problem?.kind === 'full' && (
          <section className="rounded-card bg-warning-bg p-5 text-warning-ink">
            <h2 className="text-base font-semibold">{formatTime(problem.window.starts_at)} is full</h2>
            <p className="mt-1 text-[15px]">Sorry, every spot is taken. Here is what&rsquo;s open:</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {next && (
                <Button variant="secondary" className="bg-surface" onClick={() => pick(next)}>
                  <span className="num">Take {formatTime(next.starts_at)} instead</span>
                </Button>
              )}
              {quieter && (
                <Button variant="secondary" className="bg-surface" onClick={() => { switchCart(quieter.id); setProblem(null) }}>
                  Try {quieter.name} · <WaitText waitMin={quieter.live_wait_min} nextWindowStart={quieter.next_window_start} />
                </Button>
              )}
            </div>
          </section>
        )}
        {problem?.kind === 'expired' && (
          <p role="alert" className="rounded-card bg-warning-bg px-4 py-3 text-[15px] font-semibold text-warning-ink">
            Your hold ran out. Pick a time again.
          </p>
        )}
        {problem?.kind === 'error' && (
          <p role="alert" className="rounded-card bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger-ink">
            {problem.text}
          </p>
        )}
        {held && leftMs != null && cart && <HoldCard window={held} cartName={cart.name} leftMs={leftMs} />}
      </div>

      <div aria-hidden className="h-20" />
      <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] z-30">
        <div className="mx-auto max-w-[480px] px-4 pb-3">
          <Button size="lg" className="text-base" disabled={!held} onClick={() => navigate('/checkout')}>
            {held ? `Continue · ${formatTime(held.starts_at)} pickup` : 'Pick a time to continue'}
          </Button>
        </div>
      </div>
    </>
  )
}
