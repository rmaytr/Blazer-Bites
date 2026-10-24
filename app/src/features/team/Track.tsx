// Small HTML bar charts for the pilot dashboard: one hue (UAB Green) on the value, ink for a p90 tick,
// dashed reference lines for targets. No chart library.
import { cn } from '@/lib/cn'

export interface Ref {
  value: number
  label: string
  /** Which side of its line the label sits on, so close references don't collide. */
  side?: 'left' | 'right'
}

const pos = (v: number, min: number, max: number) => `${(Math.min(max, Math.max(min, v)) - min) / (max - min) * 100}%`

/** The reference labels, placed over the tracks they belong to. */
export function RefLabels({ refs, min, max }: { refs: Ref[]; min: number; max: number }) {
  return (
    <div aria-hidden className="relative h-5 text-[12px] text-muted">
      {refs.map((r) => (
        <span
          key={r.label}
          className={cn('num absolute top-0 whitespace-nowrap', r.side === 'left' ? '-translate-x-full pr-1' : 'pl-1')}
          style={{ left: pos(r.value, min, max) }}
        >
          {r.label}
        </span>
      ))}
    </div>
  )
}

export interface TrackProps {
  value: number | null
  min: number
  max: number
  refs?: Ref[]
  /** A second figure on the same row (p90), drawn as an ink tick. */
  tick?: number | null
  label: string
  className?: string
}

export function Track({ value, min, max, refs = [], tick, label, className }: TrackProps) {
  return (
    <div role="img" aria-label={label} className={cn('relative h-3', className)}>
      <div className="absolute inset-0 rounded-full bg-raised" />
      {value !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: pos(value, min, max) }} />}
      {refs.map((r) => (
        <div key={r.label} className="absolute -top-1 -bottom-1 border-l border-dashed border-ink/60" style={{ left: pos(r.value, min, max) }} />
      ))}
      {tick != null && <div className="absolute -top-1.5 -bottom-1.5 w-[3px] -translate-x-1/2 rounded-full bg-ink" style={{ left: pos(tick, min, max) }} />}
    </div>
  )
}
