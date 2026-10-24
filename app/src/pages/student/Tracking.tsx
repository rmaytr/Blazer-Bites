import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useOrderByToken, useSession } from '@/hooks'
import { moveOrderLate, markHere, toApiError } from '@/lib/api'
import { Button, EmptyState, PageHeader, QrCode, Skeleton, StatusChip, buttonClasses, orderQrUrl, toast } from '@/components/ui'
import { formatTime, formatWindow } from '@/lib/time'
import { StatusTimeline } from '@/features/account/StatusTimeline'
import { useReadyAlert } from '@/features/account/useReadyAlert'
import { isOpenOrder } from '@/features/account/orders'
import type { OrderView } from '@/types/app'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Sticky bar on the nav: the screen's one primary action, in thumb reach. */
function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] z-30">
      <div className="glass-bar mx-auto max-w-[480px] px-4 pt-3 pb-3">{children}</div>
    </div>
  )
}

function rateLabel(order: OrderView): string {
  const unrated = order.items.filter((i) => !i.rated)
  return unrated.length === 1 ? `Rate your ${unrated[0].name.toLowerCase()}` : 'Rate your food'
}

function PickupCard({ order }: { order: OrderView }) {
  const ready = order.status === 'ready'
  const slot = order.window_starts_at ? formatWindow(order.window_starts_at, order.window_ends_at) : null
  return (
    <section aria-label="Pickup code" className="rounded-card bg-deep p-5 text-on-deep">
      <AnimatePresence initial={false}>
        {ready && (
          <motion.p
            role="status"
            className="mb-4 rounded-inner bg-positive-bg px-4 py-3 text-[15px] font-semibold text-positive-ink"
            initial={{ opacity: 0, transform: 'translateY(-8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            Ready. Show this at the cart.
          </motion.p>
        )}
      </AnimatePresence>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold opacity-80">Pickup number</p>
          <p className="num text-7xl leading-none font-bold tracking-tighter" aria-label={`Pickup number ${order.pickup_number}`}>
            {order.pickup_number}
          </p>
          <div className="mt-4 space-y-0.5 text-[15px]">
            {slot && <p className="num font-semibold">{slot}</p>}
            <p className="opacity-80">{order.cart_name}</p>
            {order.spot_name && <p className="opacity-80">{order.spot_name}</p>}
          </div>
        </div>
        <QrCode value={orderQrUrl(order.access_token)} label={`QR code for order ${order.pickup_number}`} size={ready ? 132 : 112} className="flex-none" />
      </div>
    </section>
  )
}

function LateControl({ order }: { order: OrderView }) {
  const [busy, setBusy] = useState(false)
  if (!isOpenOrder(order.status) || order.status === 'ready') return null
  if (order.moved_late) {
    return (
      <Button variant="secondary" disabled className="w-full">
        Moved to {order.window_starts_at ? formatTime(order.window_starts_at) : 'a later window'}
      </Button>
    )
  }
  const move = async () => {
    setBusy(true)
    try {
      const { startsAt } = await moveOrderLate(order.access_token)
      toast.success(`Moved to ${formatTime(startsAt)}`, { description: 'We will cook it for the new window.' })
    } catch (e) {
      const err = toApiError(e)
      toast.error(err.code === 'WINDOW_FULL' ? 'No later window has room today' : err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="secondary" loading={busy} onClick={move} className="w-full">
      Running late?
    </Button>
  )
}

function PrimaryAction({ order }: { order: OrderView }) {
  const [busy, setBusy] = useState(false)
  if (order.status === 'cancelled') {
    return (
      <Link to="/order" className={buttonClasses('primary', 'lg')}>
        Order again
      </Link>
    )
  }
  if (order.status === 'picked_up') {
    if (order.items.every((i) => i.rated)) return null
    return (
      <Link to={`/orders/${order.access_token}/rate`} className={buttonClasses('primary', 'lg')}>
        {rateLabel(order)}
      </Link>
    )
  }
  if (order.arrived_at) {
    return (
      <p role="status" className="flex min-h-14 items-center justify-center rounded-full bg-positive-bg px-5 text-base font-semibold text-positive-ink">
        We know you are here
      </p>
    )
  }
  const here = async () => {
    setBusy(true)
    try {
      await markHere(order.access_token)
    } catch (e) {
      toast.error(toApiError(e).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button size="lg" loading={busy} onClick={here}>
      I'm here
    </Button>
  )
}

export default function Tracking() {
  const { token } = useParams()
  const { data: order, loading } = useOrderByToken(token)
  const { profile } = useSession()
  useReadyAlert(order?.status, order?.cart_name ?? 'the cart', profile.notify_ready)

  if (loading) {
    return (
      <>
        <PageHeader title="Your order" back="/orders" />
        <div aria-busy="true" aria-label="Loading order" className="space-y-3">
          <Skeleton className="h-56 rounded-card" />
          <Skeleton className="h-52 rounded-card" />
        </div>
      </>
    )
  }

  if (!order) {
    return (
      <>
        <PageHeader title="Your order" back="/orders" />
        <EmptyState
          title="We can't find that order"
          body="The link may be old, or the demo was reset. Your orders are all in one place."
          action={
            <Link to="/orders" className={buttonClasses('primary')}>
              See my orders
            </Link>
          }
        />
      </>
    )
  }

  const hasBar = !(order.status === 'picked_up' && order.items.every((i) => i.rated))

  return (
    <div className={hasBar ? 'pb-20' : undefined}>
      <PageHeader title={`Order ${order.pickup_number}`} subtitle={`${order.cart_name} · placed ${formatTime(order.placed_at)}`} back="/orders" />

      {order.status === 'cancelled' ? (
        <div className="rounded-card bg-surface p-5">
          <StatusChip status="cancelled" />
          <p className="mt-3 text-[15px]">This order was cancelled. You were not charged.</p>
        </div>
      ) : (
        <>
          <PickupCard order={order} />

          <section aria-label="Status" className="mt-3 rounded-card bg-surface p-5">
            <StatusTimeline order={order} />
          </section>

          {order.status === 'picked_up' && order.items.every((i) => i.rated) && (
            <p className="mt-3 rounded-card bg-surface p-5 text-[15px]">Thanks for rating. It goes straight to the kitchen.</p>
          )}

          <div className="mt-3">
            <LateControl order={order} />
          </div>
        </>
      )}

      {hasBar && (
        <BottomBar>
          <PrimaryAction order={order} />
        </BottomBar>
      )}
    </div>
  )
}
