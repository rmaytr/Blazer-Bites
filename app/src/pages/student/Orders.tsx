import { Link, useNavigate } from 'react-router'
import { useBasket, useMyOrders } from '@/hooks'
import { EmptyState, PageHeader, Price, Skeleton, StatusChip, buttonClasses, toast } from '@/components/ui'
import { cn } from '@/lib/cn'
import { formatWindow } from '@/lib/time'
import { isOpenOrder, needsRating, orderDay, reorderLines } from '@/features/account/orders'
import type { OrderWithItems } from '@/types/app'

const itemsLine = (o: OrderWithItems) =>
  o.items.map((i) => `${i.qty > 1 ? `${i.qty} × ` : ''}${i.menu_item?.name ?? 'Dish'}${i.variant ? ` (${i.variant})` : ''}`).join(', ')

const ACTIVE_NOTE: Record<string, string> = {
  received: 'Order received. The kitchen is on it.',
  cooking: 'Cooking now.',
  ready: 'Ready. Show your code at the cart.',
}

function ActiveOrder({ order }: { order: OrderWithItems }) {
  return (
    <Link
      to={`/orders/${order.access_token}`}
      aria-label={`Order ${order.pickup_number} at ${order.cart_name}, ${order.status.replace('_', ' ')}. Track it`}
      className="block rounded-card bg-deep p-5 text-on-deep transition-transform duration-150 active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold opacity-80">Pickup number</p>
          <p className="num text-[40px] leading-none font-bold tracking-tight">{order.pickup_number}</p>
        </div>
        <StatusChip status={order.status} />
      </div>
      <p className="mt-4 text-[15px]">{ACTIVE_NOTE[order.status]}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="num text-[15px] opacity-80">
          {order.cart_name}
          {order.window && ` · ${formatWindow(order.window.starts_at, order.window.ends_at)}`}
        </p>
        <span className="flex-none text-[15px] font-semibold text-gold">Track</span>
      </div>
    </Link>
  )
}

function PastOrder({ order, onReorder }: { order: OrderWithItems; onReorder: () => void }) {
  const rate = needsRating(order)
  return (
    <li className="py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-semibold">
          {orderDay(order.placed_at)} · {order.cart_name}
        </p>
        <Price cents={order.total_cents} className="text-base" />
      </div>
      <p className="mt-0.5 text-sm text-muted">{itemsLine(order)}</p>
      {order.status === 'cancelled' && <StatusChip status="cancelled" className="mt-2" />}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onReorder} className={buttonClasses('secondary')} aria-label={`Reorder ${itemsLine(order)}`}>
          Reorder
        </button>
        {rate && (
          <Link to={`/orders/${order.access_token}/rate`} className={buttonClasses('ghost', 'md', 'text-primary')}>
            Rate it
          </Link>
        )}
      </div>
    </li>
  )
}

export default function Orders() {
  const { data: orders, loading } = useMyOrders()
  const basket = useBasket()
  const navigate = useNavigate()

  const active = (orders ?? []).filter((o) => isOpenOrder(o.status))
  const past = (orders ?? []).filter((o) => !isOpenOrder(o.status))

  const reorder = (o: OrderWithItems) => {
    basket.clear()
    for (const line of reorderLines(o)) basket.add(line, o.cart_id)
    toast.success('Added to your bag', { description: itemsLine(o) })
    navigate(`/order?cart=${o.cart_id}`)
  }

  return (
    <>
      <PageHeader title="Orders" />

      {loading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading orders">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
      )}

      {!loading && orders?.length === 0 && (
        <EmptyState
          title="No orders yet"
          body="Pick a dish and a 10-minute window. Your food is ready when you walk up."
          action={
            <Link to="/order" className={buttonClasses('primary')}>
              Order now
            </Link>
          }
        />
      )}

      {active.length > 0 && (
        <section aria-label="Now" className="space-y-3">
          {active.map((o) => (
            <ActiveOrder key={o.id} order={o} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-orders" className={cn(active.length > 0 && 'mt-8')}>
          <h2 id="past-orders" className="section-label">
            Past orders
          </h2>
          <ul className="mt-1 divide-y divide-line rounded-card bg-surface px-5">
            {past.map((o) => (
              <PastOrder key={o.id} order={o} onReorder={() => reorder(o)} />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
