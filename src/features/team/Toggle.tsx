import { cn } from '@/lib/cn'

export interface ToggleProps {
  label: string
  /** One line under the label. */
  hint?: string
  on: boolean
  onChange: (on: boolean) => void
  className?: string
}

/** A full-row switch (≥ 44px tall) for gloved hands: the whole row is the control. */
export function Toggle({ label, hint, on, onChange, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn('flex min-h-12 w-full items-center gap-3 rounded-inner px-3 py-2 text-left transition-colors hover:bg-raised', className)}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold">{label}</span>
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
      <span
        aria-hidden
        className={cn('relative h-7 w-12 flex-none rounded-full transition-colors', on ? 'bg-primary' : 'bg-line')}
      >
        <span
          className={cn(
            'absolute top-1 left-1 size-5 rounded-full bg-surface transition-transform motion-reduce:transition-none',
            on && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
