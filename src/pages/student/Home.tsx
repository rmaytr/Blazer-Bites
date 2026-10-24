// Home: when and where can I get food soonest? (docs/spec.md, screen 1)
import { lazy, Suspense } from 'react'
import { brand } from '@/config/brand'
import { CART_IDS } from '@/demo/data'
import { useCarts } from '@/hooks/useCarts'
import { useLoyalty } from '@/hooks/useLoyalty'
import { useMenu } from '@/hooks/useMenu'
import { useSettings } from '@/hooks/useSettings'
import { PageHeader, Skeleton } from '@/components/ui'
import { cartStatus, type CartStatus } from '@/lib/cartStatus'
import { useMyLocation } from '@/features/order/hooks'
import { AnswerCard, CartRow, PunchCard, TodayStrip } from '@/features/order/HomeParts'
import { soonestCart } from '@/features/order/pickup'

const CartsMap = lazy(() => import('@/features/order/CartsMap'))

const ORDER: Record<CartStatus, number> = { open: 0, express: 1, busy: 2, closed: 3 }

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading carts">
      <div className="rounded-card bg-surface p-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-10 w-48" />
        <Skeleton className="mt-2 h-4 w-40" />
        <div className="mt-5 flex items-end justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-28 rounded-full" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <ul className="mt-8 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <Skeleton className="h-[72px]" />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Home() {
  const { data: carts, loading } = useCarts()
  const { data: rules } = useSettings()
  const { data: loyalty } = useLoyalty()
  const from = useMyLocation()
  const soonest = carts ? soonestCart(carts) : null
  const { data: menu } = useMenu(soonest?.id ?? CART_IDS.sterne)

  const rows = (carts ?? [])
    .map((cart) => ({ cart, status: cartStatus(cart, rules.surgeTriggerMin) }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.cart.next_window_start ?? '').localeCompare(b.cart.next_window_start ?? ''))

  return (
    <>
      <PageHeader title={brand.name} />
      {loading || !carts ? (
        <HomeSkeleton />
      ) : (
        <>
          <AnswerCard cart={soonest} />

          <TodayStrip
            fiveDollar={menu?.all.find((i) => i.is_five_dollar_item)}
            special={menu?.all.find((i) => i.is_special)}
            to={soonest ? `/order?cart=${soonest.id}` : '/order'}
          />

          <section aria-labelledby="carts-title" className="mt-8">
            <h2 id="carts-title" className="mb-3 text-base font-semibold">
              Carts
            </h2>
            <ul className="space-y-2">
              {rows.map(({ cart, status }) => (
                <CartRow key={cart.id} cart={cart} status={status} from={from} />
              ))}
            </ul>
            <div className="mt-3">
              <Suspense fallback={<div className="h-[180px] rounded-card bg-raised" aria-hidden />}>
                <CartsMap carts={carts} />
              </Suspense>
            </div>
          </section>

          {loyalty && <PunchCard loyalty={loyalty} />}
        </>
      )}
    </>
  )
}
