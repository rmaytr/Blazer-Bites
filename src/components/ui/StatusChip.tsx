import { cn } from '@/lib/cn'
import type { CartStatus } from '@/lib/cartStatus'
import type { OrderStatus } from '@/types/app'

export type ChipStatus = CartStatus | OrderStatus

const STYLES: Record<ChipStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-campus-tint text-campus-ink' },
  busy: { label: 'Busy', className: 'bg-warning-bg text-warning-ink' },
  express: { label: 'Express menu', className: 'bg-info-bg text-info-ink' },
  closed: { label: 'Closed', className: 'bg-neutral-bg text-neutral-ink' },
  received: { label: 'Received', className: 'bg-neutral-bg text-neutral-ink' },
  cooking: { label: 'Cooking', className: 'bg-warning-bg text-warning-ink' },
  ready: { label: 'Ready', className: 'bg-positive-bg text-positive-ink' },
  picked_up: { label: 'Picked up', className: 'bg-neutral-bg text-neutral-ink' },
  cancelled: { label: 'Cancelled', className: 'bg-danger-bg text-danger-ink' },
}

export interface StatusChipProps {
  status: ChipStatus
  className?: string
}

/** Cart status (Open / Busy / Express menu / Closed) or order status. */
export function StatusChip({ status, className }: StatusChipProps) {
  const s = STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-semibold',
        s.className,
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}
