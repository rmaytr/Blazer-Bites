import { StatusChip, toast } from '@/components/ui'
import { advanceOrder } from '@/demo/controls'
import { MENU_IDS } from '@/demo/data'
import { cn } from '@/lib/cn'
import { formatWindow } from '@/lib/time'
import type { KitchenOrder, OrderStatus } from '@/types/app'
import { batchLine, dishWord, type WindowBatch } from './batch'

const ACTION: Partial<Record<OrderStatus, string>> = {
  received: 'Start cooking',
  cooking: 'Mark ready',
  ready: 'Picked up',
}

function move(o: KitchenOrder) {
  try {
    advanceOrder(o.id)
  } catch (err) {
    toast.error(`Couldn't move #${o.pickup_number}: ${err instanceof Error ? err.message : 'unknown error'}`)
  }
}

function itemsText(o: KitchenOrder): string {
  return o.items
    .map((i) =>
      // The $5 item is two different plates; the variant is the dish the crew makes.
      i.menu_item_id === MENU_IDS.fiveDollar && i.variant
        ? `${i.qty} ${i.variant.toLowerCase()}`
        : `${i.qty} ${dishWord(i.menu_item_id, i.qty, i.menu_item?.name)}${i.variant ? ` (${i.variant.toLowerCase()})` : ''}`,
    )
    .join(', ')
}

function OrderTile({ order: o }: { order: KitchenOrder }) {
  const action = ACTION[o.status] ?? 'Picked up'
  const who = o.customer_name ?? (o.channel === 'walk_up' ? 'Walk-up' : 'Guest')
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="num text-2xl leading-none font-bold">#{o.pickup_number}</span>
        <StatusChip status={o.status} />
      </span>
      <span className="mt-2 block truncate text-base font-semibold">{who}</span>
      <span className="mt-0.5 block text-[15px] text-muted">{itemsText(o)}</span>
      {action && (
        <span
          className={cn(
            'mt-3 flex min-h-11 items-center justify-center rounded-full px-4 text-base font-semibold',
            o.status === 'ready' ? 'bg-primary text-on-primary' : 'bg-raised text-ink',
          )}
        >
          {action}
        </span>
      )}
    </>
  )
  return (
    <li>
      <button
        type="button"
        onClick={() => move(o)}
        aria-label={`Order ${o.pickup_number} for ${who}: ${itemsText(o)}. Now ${o.status.replace('_', ' ')}. ${action}`}
        className="block h-full w-full rounded-inner bg-ground p-3 text-left transition-transform active:scale-[0.98] motion-reduce:active:scale-100"
      >
        {body}
      </button>
    </li>
  )
}

export function WindowGroup({ batch }: { batch: WindowBatch }) {
  const title = batch.startsAt ? formatWindow(batch.startsAt, batch.endsAt) : 'Walk-ups'
  const headingId = `w-${batch.key}`
  const open = batch.orders.filter((o) => o.status !== 'picked_up')
  const done = batch.orders.filter((o) => o.status === 'picked_up')
  return (
    <section aria-labelledby={headingId} className="rounded-card bg-surface p-4 md:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="num text-xl font-bold">
          {title}
        </h2>
        <p className="num text-[13px] text-muted">
          {batch.open} of {batch.orders.length} to hand off
        </p>
      </header>
      <p className="num mt-1 text-base font-semibold text-ink">{batchLine(batch.totals)}</p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {open.map((o) => (
          <OrderTile key={o.id} order={o} />
        ))}
      </ul>
      {done.length > 0 && (
        <p className="num mt-3 text-[13px] text-muted">Picked up: {done.map((o) => `#${o.pickup_number}`).join(', ')}</p>
      )}
    </section>
  )
}
