import { Link } from 'react-router'
import { buttonClasses, Card, Price, StarRating, StatusChip, WaitBadge } from '@/components/ui'
import { distanceMeters } from '@/demo/data'
import { publicUrl } from '@/lib/publicUrl'
import type { LoyaltyView } from '@/hooks/useLoyalty'
import type { CartStatus } from '@/lib/cartStatus'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/time'
import type { CartWithSpot, MenuItem } from '@/types/app'
import { formatDistance } from './pickup'
import type { Place } from './hooks'
import { TINT } from './tints'
import { WaitText } from './WaitText'

const press = 'transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100'

/** The screen's answer: the soonest pickup, its cart, its live wait and one Order button. */
export function AnswerCard({ cart }: { cart: CartWithSpot | null }) {
  if (!cart?.next_window_start) {
    return (
      <Card as="section" aria-labelledby="answer-title">
        <h2 id="answer-title" className="text-xl font-bold">
          No pickups left today
        </h2>
        <p className="mt-1 text-[15px] text-muted">Carts serve weekdays, 10:30 AM to 2:30 PM. See you tomorrow.</p>
      </Card>
    )
  }
  const time = formatTime(cart.next_window_start)
  return (
    <Card as="section" aria-labelledby="answer-title">
      <p className="text-[13px] font-semibold text-muted">Soonest pickup</p>
      <h2 id="answer-title" className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="num text-[40px] leading-none font-bold tracking-tighter">{time}</span>
        <span className="text-lg font-semibold">at {cart.name}</span>
      </h2>
      <p className="mt-1.5 text-[15px] text-muted">{cart.spot?.name}</p>
      <div className="mt-5 flex items-end justify-between gap-3">
        <WaitBadge waitMin={cart.live_wait_min} nextWindowStart={cart.next_window_start} />
        <Link
          to={`/order?cart=${cart.id}`}
          className={buttonClasses('primary', 'md', 'min-h-12 px-7')}
          aria-label={`Order for ${time} at ${cart.name}`}
        >
          Order
        </Link>
      </div>
    </Card>
  )
}

/** The $5 item (gold fill, deep ink) and the chef's special with its rating. */
export function TodayStrip({ fiveDollar, special, to }: { fiveDollar?: MenuItem; special?: MenuItem; to: string }) {
  if (!fiveDollar && !special) return null
  return (
    <section aria-labelledby="today-title" className="mt-8">
      <h2 id="today-title" className="section-label mb-3">
        Today
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {fiveDollar && (
          <Link to={to} className={cn('deal-tile flex min-h-36 flex-col rounded-card p-4 text-on-gold', press)}>
            <span className="flex items-start justify-between gap-2">
              <span className="num font-title text-[40px] leading-none font-extrabold tracking-tight">$5</span>
              {fiveDollar.photo_url && <DishThumb src={fiveDollar.photo_url} />}
            </span>
            <span className="card-title card-title-sm mt-auto pt-3">
              {fiveDollar.variants.join(' or ').replace(/^./, (c) => c.toUpperCase())}
            </span>
          </Link>
        )}
        {special && (
          <Link to={to} className={cn('special-tile relative flex min-h-36 flex-col rounded-card bg-surface p-4', press)}>
            <span className="flex items-start justify-between gap-2">
              <span className="tile-pill bg-evergreen-tint text-evergreen-ink">
                <span aria-hidden>✦</span> Special
              </span>
              {special.photo_url && <DishThumb src={special.photo_url} />}
            </span>
            <span className="card-title card-title-sm mt-2">{special.name}</span>
            <span className="mt-auto flex items-center justify-between gap-2 pt-3">
              <StarRating value={special.avg_rating ?? 0} count={special.rating_count} />
              <Price cents={special.price_cents} className="text-[15px] font-bold" />
            </span>
          </Link>
        )}
      </div>
    </section>
  )
}

/** A dish illustration cropped to its plate, as a small round thumbnail. */
function DishThumb({ src }: { src: string }) {
  return (
    <span className="-mt-1 -mr-1 size-12 flex-none overflow-hidden rounded-full bg-raised shadow-[0_4px_10px_-4px_rgba(15,31,23,0.35)] ring-2 ring-white/80">
      <img src={publicUrl(src)} alt="" className="size-full scale-[1.35] object-cover" />
    </span>
  )
}

export interface CartRowProps {
  cart: CartWithSpot
  status: CartStatus
  from: Place
}

/** One compact tinted row per cart: name, spot, distance, wait, next window, status. */
export function CartRow({ cart, status, from }: CartRowProps) {
  const closed = status === 'closed'
  const distance = cart.spot ? formatDistance(distanceMeters(from, cart.spot)) : null
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="card-title truncate">{cart.name}</h3>
          <StatusChip status={status} />
        </div>
        <p className="mt-1 truncate text-[13px]">
          {distance && <span className="num">{distance} · </span>}
          {cart.spot?.name}
        </p>
      </div>
      <div className="flex-none text-right">
        {closed ? (
          <p className="text-[15px] font-semibold">Not today</p>
        ) : (
          <>
            <WaitText waitMin={cart.live_wait_min} nextWindowStart={cart.next_window_start} className="text-[15px]" />
            {cart.next_window_start && (
              <p className="num mt-1 text-[13px]">Next {formatTime(cart.next_window_start)}</p>
            )}
          </>
        )}
      </div>
    </>
  )
  const tile = cn('flex min-h-[72px] items-center gap-3 rounded-card px-4 py-3', TINT[cart.tint])
  if (closed) {
    return (
      <li className={cn(tile, 'opacity-75')} aria-label={`${cart.name}, closed today`}>
        {body}
      </li>
    )
  }
  return (
    <li>
      <Link to={`/order?cart=${cart.id}`} className={cn(tile, press)} aria-label={`${cart.name}, ${status}. Order here`}>
        {body}
      </Link>
    </li>
  )
}

/** Punch card progress, linking to Rewards. */
export function PunchCard({ loyalty }: { loyalty: LoyaltyView }) {
  const left = Math.max(0, loyalty.toNext)
  return (
    <Link
      to="/rewards"
      className={cn('mt-8 block rounded-card bg-surface p-5', press)}
      aria-label={`Punch card: ${loyalty.punches} of ${loyalty.every}. ${left} more for a free meal. Open rewards`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="card-title">Punch card</h2>
        <span className="num text-[15px] font-semibold">
          {loyalty.punches}
          <span className="font-normal text-muted"> / {loyalty.every}</span>
        </span>
      </div>
      <ol className="mt-3 grid grid-cols-10 gap-1.5" aria-hidden>
        {Array.from({ length: loyalty.every }, (_, i) => (
          <li key={i} className={cn('aspect-square rounded-full', i < loyalty.punches ? 'bg-gold' : 'bg-raised')} />
        ))}
      </ol>
      <p className="mt-3 text-[15px] text-muted">
        {loyalty.rewards_available > 0
          ? 'Free meal ready. It comes off your next order.'
          : `${left} more for a free meal`}
      </p>
    </Link>
  )
}
