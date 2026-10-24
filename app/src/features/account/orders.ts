// Pure helpers for the Orders, Tracking and Rate screens.
import { TIME_ZONE } from '@/lib/time'
import type { BasketLine, OrderStatus, OrderWithItems, RatingTag } from '@/types/app'

/** The four steps the student sees, in order. */
export const STEPS = [
  { status: 'received', label: 'Received', note: 'We have your order.' },
  { status: 'cooking', label: 'Cooking', note: 'On the grill now.' },
  { status: 'ready', label: 'Ready', note: 'Come grab it.' },
  { status: 'picked_up', label: 'Picked up', note: 'Enjoy.' },
] as const satisfies readonly { status: OrderStatus; label: string; note: string }[]

/** Index of the reached step (0..3); -1 for cancelled. */
export function stepIndex(status: OrderStatus): number {
  return STEPS.findIndex((s) => s.status === status)
}

export const isOpenOrder = (status: OrderStatus): boolean => status !== 'picked_up' && status !== 'cancelled'

/** Basket lines that re-create a past order. */
export function reorderLines(order: Pick<OrderWithItems, 'items'>): BasketLine[] {
  return order.items.map((i) => ({ menuItemId: i.menu_item_id, ...(i.variant ? { variant: i.variant } : {}), qty: i.qty }))
}

export const needsRating = (order: Pick<OrderWithItems, 'status' | 'items'>): boolean =>
  order.status === 'picked_up' && order.items.some((i) => !i.rated)

const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TIME_ZONE })
const ymd = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE })

/** "Today", "Yesterday" or "Mon, Oct 20" in campus time. */
export function orderDay(at: string, now: Date = new Date()): string {
  const d = ymd.format(new Date(at))
  if (d === ymd.format(now)) return 'Today'
  if (d === ymd.format(new Date(now.getTime() - 86_400_000))) return 'Yesterday'
  return dayFmt.format(new Date(at))
}

export const RATING_TAGS: { id: RatingTag; label: string }[] = [
  { id: 'perfect', label: 'Perfect' },
  { id: 'order_again', label: 'Would order again' },
  { id: 'too_salty', label: 'Too salty' },
  { id: 'cold', label: 'Cold' },
  { id: 'small_portion', label: 'Small portion' },
]

export const COMMENT_MAX = 500
