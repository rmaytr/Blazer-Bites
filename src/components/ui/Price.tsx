import { formatCents } from '@/lib/money'
import { cn } from '@/lib/cn'

export interface PriceProps {
  cents: number
  /** Show struck through (the price before a reward). */
  strike?: boolean
  className?: string
}

export function Price({ cents, strike = false, className }: PriceProps) {
  const text = formatCents(cents)
  return strike ? (
    <s className={cn('num text-muted', className)} aria-label={`was ${text}`}>
      {text}
    </s>
  ) : (
    <span className={cn('num font-semibold', className)}>{text}</span>
  )
}
