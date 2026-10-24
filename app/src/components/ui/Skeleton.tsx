import { cn } from '@/lib/cn'

/** A flat block at the size of the content it stands in for. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-inner bg-raised animate-pulse motion-reduce:animate-none', className)} />
}
