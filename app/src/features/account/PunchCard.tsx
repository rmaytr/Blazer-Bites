import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

interface PunchCardProps {
  punches: number
  every: number
}

/** The 10-punch card: gold fills with a deep tick; the 10th is the free meal. New punches land with a small press. */
export function PunchCard({ punches, every }: PunchCardProps) {
  return (
    <ol className="grid grid-cols-5 gap-3" aria-label={`${punches} of ${every} punches`}>
      {Array.from({ length: every }, (_, i) => {
        const filled = i < punches
        const last = i === every - 1
        return (
          <li key={i} className="relative aspect-square">
            <span aria-hidden className={cn('absolute inset-0 grid place-items-center rounded-full', last && !filled ? 'bg-gold-tint text-gold-ink' : 'bg-raised text-muted')}>
              <span className="num text-[13px] font-semibold">{last ? 'Free' : i + 1}</span>
            </span>
            <motion.span
              aria-hidden
              className="absolute inset-0 grid place-items-center rounded-full bg-gold text-on-gold"
              initial={false}
              animate={filled ? { opacity: 1, transform: 'scale(1)' } : { opacity: 0, transform: 'scale(0.9)' }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <svg viewBox="0 0 24 24" className="size-1/2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </motion.span>
            <span className="sr-only">{filled ? `Punch ${i + 1}` : last ? 'Free meal' : `Punch ${i + 1}, not yet`}</span>
          </li>
        )
      })}
    </ol>
  )
}
