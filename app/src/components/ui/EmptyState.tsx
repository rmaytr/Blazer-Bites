import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  title: string
  body?: string
  /** One next step, usually a Button or Link. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-start gap-3 rounded-card bg-surface p-6', className)}>
      <h2 className="text-xl font-bold">{title}</h2>
      {body && <p className="max-w-prose text-base text-muted">{body}</p>}
      {action}
    </div>
  )
}
