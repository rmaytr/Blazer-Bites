import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/time'
import type { OrderView } from '@/types/app'
import { STEPS, stepIndex } from './orders'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

interface StatusTimelineProps {
  order: Pick<OrderView, 'status' | 'placed_at' | 'cooking_at' | 'ready_at' | 'picked_up_at'>
}

/** Received → Cooking → Ready → Picked up. The rail fills (scaleY) as the store moves the order on. */
export function StatusTimeline({ order }: StatusTimelineProps) {
  const reached = stepIndex(order.status)
  const times = [order.placed_at, order.cooking_at, order.ready_at, order.picked_up_at]
  // Rail runs from the first dot's centre to the last; each step is a third of it.
  const fill = Math.max(0, reached) / (STEPS.length - 1)

  return (
    <div className="relative">
      <div aria-hidden className="absolute top-6 bottom-6 left-[13px] w-0.5 rounded-full bg-raised">
        <motion.div
          className="h-full w-full origin-top rounded-full bg-evergreen"
          initial={false}
          animate={{ transform: `scaleY(${fill})` }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
        />
      </div>
      <ol className="relative" aria-label="Order progress">
        {STEPS.map((step, i) => {
          const done = i <= reached
          const current = i === reached
          const at = times[i]
          return (
            <li key={step.status} className="flex min-h-11 items-center gap-3 py-0.5" aria-current={current ? 'step' : undefined}>
              <span
                aria-hidden
                className={cn(
                  'grid size-7 flex-none place-items-center rounded-full transition-colors duration-200',
                  done ? 'bg-evergreen text-deep' : 'bg-raised text-muted',
                )}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  <span className="size-2 rounded-full bg-current" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <p className={cn('text-[15px]', current ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted')}>
                  {step.label}
                  {current && <span className="font-normal text-muted"> · {step.note}</span>}
                  <span className="sr-only">{done ? (current ? ', current step' : ', done') : ', not yet'}</span>
                </p>
                {done && at && <span className="num flex-none text-[13px] text-muted">{formatTime(at)}</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
