// Kitchen board (/team/kitchen): what do we cook next? Owned by workstream C.
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { EmptyState, Skeleton, toast } from '@/components/ui'
import { CART_IDS } from '@/demo/data'
import { setCartSurge, setItemSoldOut } from '@/demo/controls'
import { useCarts, useKitchenOrders, useMenu } from '@/hooks'
import { cn } from '@/lib/cn'
import { batchByWindow, dishTitle, prepTotals } from '@/features/team/batch'
import { Toggle } from '@/features/team/Toggle'
import { StopWalkups, WalkupCounter, walkupsStopped } from '@/features/team/WalkupPanel'
import { WindowGroup } from '@/features/team/WindowGroup'
import type { CartWithSpot } from '@/types/app'

/** Windows shown before "Show later windows": enough to plan the next half hour. */
const WINDOWS_SHOWN = 3

function attempt(fn: () => void, what: string) {
  try {
    fn()
  } catch (err) {
    toast.error(`Couldn't ${what}: ${err instanceof Error ? err.message : 'unknown error'}`)
  }
}

function CartPicker({ carts, value, onChange }: { carts: CartWithSpot[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Cart" className="flex flex-wrap gap-1 rounded-full bg-raised p-1">
      {carts.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={c.id === value}
          onClick={() => onChange(c.id)}
          className={cn(
            'min-h-11 rounded-full px-4 text-[15px] font-semibold whitespace-nowrap transition-colors',
            c.id === value ? 'bg-surface text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {c.name}
          {!c.is_open && <span className="font-normal"> · closed</span>}
        </button>
      ))}
    </div>
  )
}

function Controls({ cart }: { cart: CartWithSpot }) {
  const menu = useMenu(cart.id).data
  const all = menu?.all ?? []
  const express = all.filter((i) => i.is_express).map((i) => dishTitle(i.id, i.name).toLowerCase())
  const soldOut = new Set(cart.sold_out_item_ids)
  return (
    <>
      <section aria-label="Walk-up line" className="rounded-card bg-surface p-4">
        <WalkupCounter cart={cart} />
      </section>
      <section aria-labelledby="menu-controls" className="rounded-card bg-surface p-2">
        <h2 id="menu-controls" className="px-3 pt-2 text-base font-semibold">
          Menu
        </h2>
        <Toggle
          label="Express menu"
          hint={`Only ${express.join(' and ')} while it's busy`}
          on={cart.surge}
          onChange={(on) => attempt(() => setCartSurge(cart.id, on), 'switch the express menu')}
        />
        <p className="px-3 pt-3 text-[13px] text-muted">Sold out</p>
        {all.map((i) => (
          <Toggle
            key={i.id}
            label={dishTitle(i.id, i.name)}
            on={soldOut.has(i.id)}
            onChange={(on) => attempt(() => setItemSoldOut(cart.id, i.id, on), `mark ${i.name} sold out`)}
          />
        ))}
      </section>
    </>
  )
}

function PrepTable({ cartId }: { cartId: string }) {
  const orders = useKitchenOrders(cartId).data ?? []
  const rows = prepTotals(orders)
  return (
    <section aria-labelledby="prep" className="rounded-card bg-surface p-4">
      <h2 id="prep" className="text-base font-semibold">
        Today's prep
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">No orders yet today.</p>
      ) : (
        <table className="num mt-2 w-full text-[15px]">
          <thead>
            <tr className="text-[13px] text-muted">
              <th className="py-1 text-left font-normal">Dish</th>
              <th className="py-1 text-right font-normal">To start</th>
              <th className="py-1 text-right font-normal">Today</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="py-2">{dishTitle(r.id, r.name)}</td>
                <td className="py-2 text-right font-semibold">{r.toCook}</td>
                <td className="py-2 text-right text-muted">{r.qty}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-line font-semibold">
              <td className="py-2">All dishes</td>
              <td className="py-2 text-right">{rows.reduce((s, r) => s + r.toCook, 0)}</td>
              <td className="py-2 text-right">{rows.reduce((s, r) => s + r.qty, 0)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  )
}

function Board({ cart }: { cart: CartWithSpot }) {
  const [showAll, setShowAll] = useState(false)
  const orders = useKitchenOrders(cart.id).data ?? []
  const batches = batchByWindow(orders)
  const shown = showAll ? batches : batches.slice(0, WINDOWS_SHOWN)
  if (batches.length === 0) return <EmptyState title="Nothing to cook" body="Every order today has been handed off." />
  return (
    <div className="flex flex-col gap-4">
      {shown.map((b) => (
        <WindowGroup key={b.key} batch={b} />
      ))}
      {batches.length > WINDOWS_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="min-h-12 rounded-full bg-surface px-5 text-base font-semibold hover:bg-raised"
        >
          {showAll ? 'Show the next windows only' : `Show ${batches.length - WINDOWS_SHOWN} later windows`}
        </button>
      )}
    </div>
  )
}

export default function Kitchen() {
  const [params, setParams] = useSearchParams()
  const carts = useCarts()
  const cartId = params.get('cart') ?? CART_IDS.sterne
  const cart = carts.data?.find((c) => c.id === cartId) ?? null
  const toOpen = useKitchenOrders(cart?.id).data?.filter((o) => o.status !== 'picked_up').length ?? 0

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-2 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kitchen</h1>
          {cart && (
            <p className="num mt-1 text-[15px] text-muted">
              {cart.spot?.name ?? cart.name} · {toOpen} orders to hand off · {Math.ceil(cart.live_wait_min)} min wait
            </p>
          )}
        </div>
        {carts.data && <CartPicker carts={carts.data} value={cartId} onChange={(id) => setParams({ cart: id }, { replace: true })} />}
      </header>

      {carts.loading && <Skeleton className="h-64 w-full rounded-card" />}
      {!carts.loading && !cart && <EmptyState title="Unknown cart" body="Pick a cart above." />}
      {cart && !cart.is_open && <EmptyState title={`${cart.name} is closed today`} body="Pick an open cart above." />}
      {cart?.is_open && (
        <>
          {walkupsStopped(cart) && <StopWalkups cart={cart} />}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid grid-cols-1 content-start gap-4 sm:grid-cols-2 lg:order-last lg:grid-cols-1">
              <Controls cart={cart} />
              <PrepTable cartId={cart.id} />
            </div>
            <Board key={cart.id} cart={cart} />
          </div>
        </>
      )}
    </>
  )
}
