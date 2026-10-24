import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/cn'
import { displayWait } from '@/lib/wait'

export interface WaitTextProps {
  waitMin: number | null | undefined
  nextWindowStart: string | null | undefined
  className?: string
}

/** One-line wait for compact rows ("4 min wait"). Goes through displayWait, so it never shows over 10. */
export function WaitText({ waitMin, nextWindowStart, className }: WaitTextProps) {
  const { data: rules } = useSettings()
  const w = displayWait(waitMin, rules.maxWaitMin, nextWindowStart)
  const text = w.kind === 'full' ? 'Full right now' : w.minutes === 0 ? 'No wait' : `${w.minutes} min wait`
  return <span className={cn('num font-semibold', className)}>{text}</span>
}
