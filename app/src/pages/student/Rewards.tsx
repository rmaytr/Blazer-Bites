import { Link } from 'react-router'
import { useLoyalty } from '@/hooks'
import { PageHeader, Skeleton, buttonClasses } from '@/components/ui'
import { PunchCard } from '@/features/account/PunchCard'
import { orderDay } from '@/features/account/orders'

export default function Rewards() {
  const { data: card, loading } = useLoyalty()

  if (loading || !card) {
    return (
      <>
        <PageHeader title="Rewards" />
        <div aria-busy="true" aria-label="Loading rewards" className="space-y-3">
          <Skeleton className="h-72 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </>
    )
  }

  const free = card.rewards_available
  const next = card.toNext === 1 ? 'Your next meal is free' : `${card.toNext} more for a free meal`

  return (
    <>
      <PageHeader title="Rewards" subtitle="Every 10th meal is on us." />

      <section aria-labelledby="punch-title" className="rounded-card bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="punch-title" className="card-title">
            Punch card
          </h2>
          <p className="num text-[15px] text-muted">{card.lifetime_meals} meals so far</p>
        </div>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="num text-[40px] leading-none font-bold tracking-tight">
            {card.punches}
            <span className="text-muted"> / {card.every}</span>
          </span>
        </p>
        <p className="mt-1 text-[15px]">{next}</p>
        <div className="mt-5">
          <PunchCard punches={card.punches} every={card.every} />
        </div>
        <p className="mt-4 text-sm text-muted">
          Each meal on your account is a punch. The free meal comes off your next order at checkout, nothing to tap.
        </p>
      </section>

      <section aria-label="Free meals" className="mt-3 flex items-center justify-between gap-3 rounded-card bg-surface p-5">
        <div>
          <h2 className="card-title">Free meals ready</h2>
          <p className="text-sm text-muted">{free > 0 ? 'Comes off your next order.' : 'Your 10th punch unlocks one.'}</p>
        </div>
        <span className={free > 0 ? 'num grid h-11 min-w-11 place-items-center rounded-full bg-gold px-3 text-xl font-bold text-on-gold' : 'num text-xl font-bold text-muted'}>
          {free}
        </span>
      </section>

      {card.recent.length > 0 && (
        <section aria-labelledby="recent-title" className="mt-8">
          <h2 id="recent-title" className="section-label">
            Recent punches
          </h2>
          <ul className="mt-1 divide-y divide-line rounded-card bg-surface px-5">
            {card.recent.map((r) => (
              <li key={r.orderId} className="flex min-h-14 items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[15px] font-medium">{r.cartName}</p>
                  <p className="text-[13px] text-muted">{orderDay(r.placedAt)}</p>
                </div>
                <span className="num text-[15px] font-semibold text-positive-ink">
                  +{r.meals} {r.meals === 1 ? 'punch' : 'punches'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/order" className={buttonClasses('primary', 'lg', 'mt-6')}>
        Order and get punch {Math.min(card.punches + 1, card.every)}
      </Link>
    </>
  )
}
