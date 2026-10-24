import { useState } from 'react'
import { useCarts, useDemoSettings, useMyOrders } from '@/hooks'
import { advanceOrder, resetDemo, setAutoAdvance, setCartSurge } from '@/demo/controls'
import { Button, toast } from '@/components/ui'
import { toApiError } from '@/lib/api'
import { isOpenOrder, STEPS, stepIndex } from './orders'
import { SettingsSection, SwitchRow } from './SettingControls'

/** Profile → Demo controls: rush, advance, auto-advance, reset. Instant, no latency. */
export function DemoControls() {
  const { data: carts } = useCarts()
  const { data: orders } = useMyOrders()
  const { autoAdvance } = useDemoSettings()
  const open = (carts ?? []).filter((c) => c.is_open)
  const [cartId, setCartId] = useState<string>('')
  const [confirming, setConfirming] = useState(false)
  const cart = open.find((c) => c.id === cartId) ?? open[0]
  const active = (orders ?? []).find((o) => isOpenOrder(o.status))
  const nextStep = active ? STEPS[stepIndex(active.status) + 1] : undefined

  const advance = () => {
    if (!active) return
    try {
      advanceOrder(active.id)
    } catch (e) {
      toast.error(toApiError(e).message)
    }
  }

  const reset = () => {
    resetDemo()
    setConfirming(false)
    toast.success('Demo reset', { description: 'Fresh orders, windows and punch card.' })
  }

  return (
    <SettingsSection title="Demo controls" description="For the pitch. Changes show on every screen at once, Team view included.">
      <div className="space-y-5">
        <div>
          <label htmlFor="rush-cart" className="block text-[15px] font-medium">
            Simulate a rush
          </label>
          <p className="mt-0.5 text-[13px] text-muted">The cart switches to the express menu so nobody waits long.</p>
          <div className="mt-2 flex items-center gap-2">
            <select
              id="rush-cart"
              value={cart?.id ?? ''}
              onChange={(e) => setCartId(e.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-inner bg-raised px-3 text-[15px]"
            >
              {open.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.surge ? ' (rush on)' : ''}
                </option>
              ))}
            </select>
            {cart && (
              <Button
                variant={cart.surge ? 'danger' : 'secondary'}
                aria-pressed={cart.surge}
                onClick={() => setCartSurge(cart.id, !cart.surge)}
                className="flex-none"
              >
                {cart.surge ? 'End rush' : 'Start rush'}
              </Button>
            )}
          </div>
          {cart?.surge && (
            <p role="status" className="mt-2 rounded-inner bg-info-bg px-3 py-2 text-[13px] font-semibold text-info-ink">
              Express menu on at {cart.name}
            </p>
          )}
        </div>

        <div>
          <p className="text-[15px] font-medium">Advance my order</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {active ? `Order ${active.pickup_number} at ${active.cart_name} is ${STEPS[stepIndex(active.status)].label.toLowerCase()}.` : 'No order in progress. Place one to try this.'}
          </p>
          <Button variant="secondary" onClick={advance} disabled={!active || !nextStep} className="mt-2">
            {nextStep ? `Move to ${nextStep.label}` : 'Advance'}
          </Button>
        </div>

        <SwitchRow
          label="Auto-advance orders"
          description="Cooking after 8 s, Ready after 25 s."
          checked={autoAdvance}
          onChange={setAutoAdvance}
        />

        <div>
          {confirming ? (
            <div role="alertdialog" aria-labelledby="reset-q" className="rounded-inner bg-danger-bg p-4 text-danger-ink">
              <p id="reset-q" className="text-[15px] font-semibold">
                Reset the demo?
              </p>
              <p className="mt-0.5 text-[13px]">Orders, ratings, punches, your bag and these settings go back to the start.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="danger" onClick={reset} className="bg-surface" autoFocus>
                  Reset demo
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirming(true)} className="-ml-5 text-danger-ink">
              Reset demo
            </Button>
          )}
        </div>
      </div>
    </SettingsSection>
  )
}
