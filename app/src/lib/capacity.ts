// Client mirror of window capacity. The database enforces it (hold_window_spot + CHECK).

export interface WindowLike {
  id: string
  capacity: number
  booked_count: number
  starts_at: string
  ends_at: string
}

export interface HoldLike {
  window_id: string
  expires_at: string
}

const isActive = (h: HoldLike, now: Date): boolean => new Date(h.expires_at).getTime() > now.getTime()

/** Capacity minus bookings minus live holds on this window, never below zero. */
export function spotsLeft(window: WindowLike, holds: readonly HoldLike[] = [], now: Date = new Date()): number {
  const held = holds.filter((h) => h.window_id === window.id && isActive(h, now)).length
  return Math.max(0, window.capacity - window.booked_count - held)
}

/** A spot can be held if the window has not ended and has room. */
export function canHold(window: WindowLike, holds: readonly HoldLike[] = [], now: Date = new Date()): boolean {
  return new Date(window.ends_at).getTime() > now.getTime() && spotsLeft(window, holds, now) > 0
}

/** Earliest window that can still be held, or null. */
export function nextOpenWindow<W extends WindowLike>(
  windows: readonly W[],
  holds: readonly HoldLike[] = [],
  now: Date = new Date(),
): W | null {
  const sorted = [...windows].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  return sorted.find((w) => canHold(w, holds, now)) ?? null
}
