import { AnimatePresence, motion } from 'motion/react'
import { useSettings } from '@/hooks/useSettings'
import { displayWait } from '@/lib/wait'
import { formatTime } from '@/lib/time'
import { cn } from '@/lib/cn'

export interface WaitBadgeProps {
  /** Raw wait in minutes (carts.live_wait_min). Never rendered directly. */
  waitMin: number | null | undefined
  nextWindowStart: string | null | undefined
  /** Override the live setting (tests, previews). */
  maxWaitMin?: number
  size?: 'md' | 'lg'
  className?: string
}

/**
 * The ONLY component that shows a wait. Goes through displayWait, so it can never show
 * more than the max: past it, it says "Full right now" and the next window instead.
 */
export function WaitBadge({ waitMin, nextWindowStart, maxWaitMin, size = 'md', className }: WaitBadgeProps) {
  const { data: rules } = useSettings()
  const w = displayWait(waitMin, maxWaitMin ?? rules.maxWaitMin, nextWindowStart)
  const big = size === 'lg' ? 'text-[40px]' : 'text-[32px]'

  if (w.kind === 'full') {
    const next = w.nextWindow ? `Next window ${formatTime(w.nextWindow)}` : 'No more windows today'
    return (
      <div className={cn('flex flex-col', className)} role="status" aria-label={`Full right now. ${next}.`}>
        <span className={cn('font-bold leading-none tracking-tight', size === 'lg' ? 'text-3xl' : 'text-2xl')}>
          Full right now
        </span>
        <span className="mt-1 text-base text-muted">{next}</span>
      </div>
    )
  }

  const label = w.minutes === 0 ? 'No wait' : `${w.minutes} minute${w.minutes === 1 ? '' : 's'} wait`
  return (
    <div className={cn('flex items-baseline gap-2', className)} role="status" aria-label={label}>
      {w.minutes === 0 ? (
        <span className={cn('font-bold leading-none tracking-tight', size === 'lg' ? 'text-4xl' : 'text-3xl')}>No wait</span>
      ) : (
        <>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={w.minutes}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className={cn('num font-bold leading-none tracking-tighter', big)}
              aria-hidden
            >
              {w.minutes}
            </motion.span>
          </AnimatePresence>
          <span className="text-lg font-semibold text-muted" aria-hidden>
            min wait
          </span>
        </>
      )}
    </div>
  )
}
