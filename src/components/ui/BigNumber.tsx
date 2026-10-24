import { cn } from '@/lib/cn'

export interface BigNumberProps {
  value: string | number
  label: string
  /** 'xl' for the pickup number on the tracking screen. */
  size?: 'lg' | 'xl'
  className?: string
}

/** A figure read from arm's length: pickup number, orders ahead, today's count. */
export function BigNumber({ value, label, size = 'lg', className }: BigNumberProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className={cn('num font-bold leading-none tracking-tighter', size === 'xl' ? 'text-7xl' : 'text-[40px]')}>{value}</span>
    </div>
  )
}
