import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

function Star({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export interface StarRatingProps {
  /** Interactive: the chosen stars (0 = none). Read-only: the average. */
  value: number
  /** Present = interactive one-tap rating. */
  onChange?: (stars: number) => void
  /** Read-only: number of ratings, shown as "(32)". */
  count?: number
  /** Dish name for the interactive group label. */
  label?: string
  className?: string
}

/** One-tap 1–5 rating, or a compact "★ 4.4 (32)" read-out. */
export function StarRating({ value, onChange, count, label, className }: StarRatingProps) {
  if (!onChange) {
    if (!count) return <span className={cn('text-sm text-muted', className)}>No ratings yet</span>
    return (
      <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', className)} aria-label={`Rated ${value.toFixed(1)} out of 5 from ${count} ratings`}>
        <Star filled className="size-4 text-gold" />
        <span className="num" aria-hidden>
          {value.toFixed(1)}
        </span>
        <span className="num font-normal text-muted" aria-hidden>
          ({count})
        </span>
      </span>
    )
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(5, value + 1))
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(1, value - 1))
    else return
    e.preventDefault()
  }

  return (
    <div role="radiogroup" aria-label={label ? `Rate ${label}` : 'Rating'} className={cn('flex gap-1', className)} onKeyDown={onKey}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? '' : 's'}`}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          onClick={() => onChange(n)}
          className="grid size-12 place-items-center rounded-full text-gold transition-transform active:scale-90 motion-reduce:active:scale-100"
        >
          <Star filled={n <= value} className={cn('size-9', n > value && 'text-muted')} />
        </button>
      ))}
    </div>
  )
}
