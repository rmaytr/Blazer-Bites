import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { buttonClasses, Sheet, StatusChip } from '@/components/ui'
import { priceOf } from '@/demo/data'
import { useSettings } from '@/hooks/useSettings'
import { cartStatus } from '@/lib/cartStatus'
import { cn } from '@/lib/cn'
import { formatCents } from '@/lib/money'
import { formatTime } from '@/lib/time'
import type { BasketLine, CartWithSpot, MenuItem } from '@/types/app'
import { TINT } from './tints'
import { WaitText } from './WaitText'
import { publicUrl } from '@/lib/publicUrl'

const press = 'transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100'

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 flex-none" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export interface PickupChipProps {
  cart: CartWithSpot
  carts: readonly CartWithSpot[]
  onChoose: (cartId: string) => void
}

/** "Pickup at Sterne · soonest 11:40 AM" → a sheet of carts with their waits. */
export function PickupChip({ cart, carts, onChoose }: PickupChipProps) {
  const [open, setOpen] = useState(false)
  const { data: rules } = useSettings()
  const soonest = cart.next_window_start ? `soonest ${formatTime(cart.next_window_start)}` : 'closed today'
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn('inline-flex min-h-11 max-w-full items-center gap-2 rounded-full py-2 pr-3 pl-4 text-[15px] font-semibold', TINT[cart.tint], press)}
      >
        <span className="num truncate">
          Pickup at {cart.name} · {soonest}
        </span>
        <Chevron />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Where to pick up">
        <ul className="space-y-2">
          {carts.map((c) => {
            const status = cartStatus(c, rules.surgeTriggerMin)
            const closed = status === 'closed'
            const current = c.id === cart.id
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={closed}
                  aria-pressed={current}
                  onClick={() => {
                    onChoose(c.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex min-h-[72px] w-full items-center gap-3 rounded-card px-4 py-3 text-left disabled:opacity-60',
                    TINT[c.tint],
                    current && 'ring-2 ring-ink',
                    !closed && press,
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-base font-semibold">{c.name}</span>
                      <StatusChip status={status} />
                    </span>
                    <span className="mt-1 block truncate text-[13px]">{c.spot?.name}</span>
                  </span>
                  <span className="flex-none text-right">
                    {closed ? (
                      <span className="text-[15px] font-semibold">Not today</span>
                    ) : (
                      <>
                        <WaitText waitMin={c.live_wait_min} nextWindowStart={c.next_window_start} className="block text-[15px]" />
                        {c.next_window_start && <span className="num mt-1 block text-[13px]">Next {formatTime(c.next_window_start)}</span>}
                      </>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Sheet>
    </>
  )
}

/** Shown in a surge: only express items are on. */
export function ExpressNote() {
  return (
    <p role="status" className="rounded-card bg-info-bg px-4 py-3 text-[15px] font-semibold text-info-ink">
      Express menu while it&rsquo;s busy, so nobody waits long.
    </p>
  )
}

/** Next week's special: shown, not orderable. */
export function NextSpecialCard({ item }: { item: MenuItem }) {
  return (
    <article className="flex items-center gap-4 rounded-card bg-surface p-4" aria-labelledby="next-special">
      {item.photo_url && <img src={publicUrl(item.photo_url)} alt="" loading="lazy" className="size-16 flex-none rounded-small object-cover" />}
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-muted">Coming next week</p>
        <h3 id="next-special" className="text-base font-semibold">
          {item.name}
        </h3>
        <p className="num text-[13px] text-muted">{formatCents(item.price_cents)}</p>
      </div>
    </article>
  )
}

export const bagTotal = (lines: readonly BasketLine[]): number => lines.reduce((s, l) => s + priceOf(l.menuItemId) * l.qty, 0)

/** Sticky bar on the nav: the screen's one primary action. */
export function BagBar({ count, lines }: { count: number; lines: readonly BasketLine[] }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          className="fixed inset-x-0 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))] z-30"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
        >
          <div className="mx-auto max-w-[480px] px-4 pb-3">
            <Link to="/order/time" className={buttonClasses('primary', 'lg', 'gap-1.5 px-5 text-[15px] whitespace-nowrap')}>
              <span>Choose pickup time</span>
              <span aria-hidden>·</span>
              <motion.span
                key={count}
                className="num inline-block"
                initial={{ scale: 1.35 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.35, bounce: 0.4 }}
              >
                {count} {count === 1 ? 'item' : 'items'}
              </motion.span>
              <span aria-hidden>·</span>
              <span className="num">{formatCents(bagTotal(lines))}</span>
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
