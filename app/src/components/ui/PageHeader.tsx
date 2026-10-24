import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  /** Path for the back arrow. */
  back?: string
  /** One trailing action. */
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, back, action, className }: PageHeaderProps) {
  return (
    <header className={cn('flex items-start gap-2 pt-4 pb-5', className)}>
      {back && (
        <Link to={back} aria-label="Back" className="-ml-2 grid size-11 flex-none place-items-center rounded-full hover:bg-raised">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
      )}
      <div className="min-w-0 flex-1 pt-1">
        <h1 className="text-2xl leading-tight font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex-none">{action}</div>}
    </header>
  )
}
