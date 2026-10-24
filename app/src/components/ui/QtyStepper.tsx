import { cn } from '@/lib/cn'

export interface QtyStepperProps {
  value: number
  onChange: (qty: number) => void
  /** What is being counted, for screen readers ("Hot chicken sandwich"). */
  label: string
  min?: number
  max?: number
  className?: string
}

const step = 'grid size-11 place-items-center rounded-full bg-raised text-2xl font-semibold leading-none active:scale-95 disabled:opacity-40 transition-transform motion-reduce:active:scale-100'

export function QtyStepper({ value, onChange, label, min = 0, max = 9, className }: QtyStepperProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className={step} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`One fewer ${label}`}>
        −
      </button>
      <span className="num w-6 text-center text-lg font-semibold" aria-live="polite">
        {value}
      </span>
      <button type="button" className={step} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={`One more ${label}`}>
        +
      </button>
    </div>
  )
}
