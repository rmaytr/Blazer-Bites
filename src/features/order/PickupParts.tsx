import { cn } from '@/lib/cn'
import { formatTime, formatWindow } from '@/lib/time'
import type { WindowWithSpots } from '@/types/app'
import { formatCountdown, gapClock, type GapSuggestion } from './pickup'

const LOW_SPOTS = 3
const EXPIRING_MS = 60_000

export interface WindowScrollerProps {
  windows: readonly WindowWithSpots[]
  selectedId: string | null
  pendingId: string | null
  suggestion: GapSuggestion | null
  onPick: (w: WindowWithSpots) => void
}

/** Horizontal row of 10-minute windows with spots left. Full ones read "Full" and are not bookable. */
export function WindowScroller({ windows, selectedId, pendingId, suggestion, onPick }: WindowScrollerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Pickup times"
      className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none]"
    >
      {windows.map((w) => {
        const selected = w.id === selectedId
        const suggested = suggestion?.windowId === w.id
        const time = formatTime(w.starts_at).replace(/ [AP]M$/, '')
        return (
          <button
            key={w.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={w.is_full || undefined}
            aria-busy={pendingId === w.id || undefined}
            aria-label={`${formatWindow(w.starts_at, w.ends_at)}, ${w.is_full ? 'full' : `${w.spots_left} spots left`}${suggested ? `, fits your ${gapClock(suggestion.gap.start)} gap` : ''}`}
            onClick={() => onPick(w)}
            className={cn(
              'flex min-h-[76px] min-w-[84px] flex-none snap-start flex-col items-start justify-center rounded-inner px-3.5 py-2 text-left',
              'transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:active:scale-100',
              w.is_full ? 'bg-raised text-muted' : selected ? 'bg-ink text-surface' : 'bg-surface',
              suggested && !selected && 'ring-2 ring-evergreen',
            )}
          >
            {suggested && (
              <span className={cn('mb-1 rounded-full px-2 py-0.5 text-xs font-semibold', selected ? 'bg-surface text-positive-ink' : 'bg-positive-bg text-positive-ink')}>
                Fits your {gapClock(suggestion.gap.start)} gap
              </span>
            )}
            <span className={cn('num text-xl leading-tight font-bold', w.is_full && 'line-through decoration-2')}>{time}</span>
            <span
              className={cn(
                'num text-[13px] font-semibold',
                !selected && !w.is_full && (w.spots_left <= LOW_SPOTS ? 'text-warning-ink' : 'text-muted'),
              )}
            >
              {pendingId === w.id ? 'Holding…' : w.is_full ? 'Full' : `${w.spots_left} left`}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The held spot with its visible countdown. */
export function HoldCard({ window, cartName, leftMs }: { window: WindowWithSpots; cartName: string; leftMs: number }) {
  const expiring = leftMs <= EXPIRING_MS
  return (
    <section aria-labelledby="hold-title" className={cn('rounded-card p-5', expiring ? 'bg-warning-bg text-warning-ink' : 'bg-surface')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="hold-title" className="text-[13px] font-semibold opacity-80">
            Held for you
          </h2>
          <p className="num mt-1 text-xl font-bold">{formatWindow(window.starts_at, window.ends_at)}</p>
          <p className="mt-0.5 text-[15px]">at {cartName}</p>
        </div>
        <p className="text-right">
          <span className="num block text-[32px] leading-none font-bold tracking-tight" role="timer" aria-label={`${formatCountdown(leftMs)} left on your hold`}>
            {formatCountdown(leftMs)}
          </span>
          <span className="mt-1 block text-[13px] opacity-80">left to pay</span>
        </p>
      </div>
    </section>
  )
}
