import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'

const SAVED_MS = 1600

/** Quiet "Saved" stamp: call flash() after a control saved itself. */
export function useSavedStamp(): { saved: boolean; flash: () => void } {
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const flash = useCallback(() => {
    setSaved(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setSaved(false), SAVED_MS)
  }, [])
  return { saved, flash }
}

export function SavedStamp({ saved }: { saved: boolean }) {
  return (
    <span role="status" aria-live="polite" className="text-[13px] font-semibold text-positive-ink">
      <AnimatePresence>
        {saved && (
          <motion.span
            className="inline-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            Saved
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

interface SectionProps {
  title: string
  description?: string
  saved?: boolean
  children: ReactNode
  className?: string
}

/** A settings section: title + stamp, a grey description, then its controls (stacked on the phone). */
export function SettingsSection({ title, description, saved, children, className }: SectionProps) {
  return (
    <section className={cn('rounded-card bg-surface p-5', className)} aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {saved !== undefined && <SavedStamp saved={saved} />}
      </div>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

interface SwitchRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
}

/** Label + description on the left, a switch on the right. The whole row is the 44px+ target. */
export function SwitchRow({ label, description, checked, onChange, disabled }: SwitchRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-4 rounded-inner px-2 py-2 text-left transition-colors duration-150 hover:bg-ground disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
      <span aria-hidden className={cn('relative h-7 w-12 flex-none rounded-full transition-colors duration-150', checked ? 'bg-evergreen' : 'bg-muted/60')}>
        <span
          className={cn(
            'absolute top-1 left-1 size-5 rounded-full bg-surface transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}

interface ChipProps {
  pressed: boolean
  onToggle: () => void
  /** Pale tile + same-hue ink when on. */
  tone: 'danger' | 'positive' | 'neutral'
  children: ReactNode
  ariaLabel?: string
}

const ON: Record<ChipProps['tone'], string> = {
  danger: 'bg-danger-bg text-danger-ink',
  positive: 'bg-positive-bg text-positive-ink',
  neutral: 'bg-ink text-surface',
}

/** A toggle chip (aria-pressed), 44px tall, with a check when on so the state is not colour alone. */
export function ToggleChip({ pressed, onToggle, tone, children, ariaLabel }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold select-none',
        'transition-[transform,background-color,color] duration-150 active:scale-[0.97] motion-reduce:active:scale-100',
        pressed ? ON[tone] : 'bg-raised text-ink',
      )}
    >
      {pressed && (
        <svg viewBox="0 0 24 24" aria-hidden className="-ml-1 size-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
      {children}
    </button>
  )
}
