import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'li'
  /** Remove the inner padding (for full-bleed photos). */
  flush?: boolean
}

/** A rounded surface one tone step off the ground. No border, no shadow. */
export function Card({ as: Tag = 'div', flush = false, className, ...rest }: CardProps) {
  return <Tag className={cn('rounded-card bg-surface overflow-hidden', !flush && 'p-5', className)} {...rest} />
}
