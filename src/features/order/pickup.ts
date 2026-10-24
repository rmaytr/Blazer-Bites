// Pure helpers for the order flow: the soonest cart, distances, class-gap suggestions, countdowns.
import { campusMinutes, campusWeekday } from '@/demo/data'
import type { CartWithSpot, ClassGap, WindowWithSpots } from '@/types/app'

/** Open carts that still have a pickup window, soonest window first, then the shorter wait. */
export function openCartsBySoonest(carts: readonly CartWithSpot[]): CartWithSpot[] {
  return carts
    .filter((c) => c.is_open && c.next_window_start)
    .sort(
      (a, b) =>
        (a.next_window_start ?? '').localeCompare(b.next_window_start ?? '') || (a.live_wait_min ?? 0) - (b.live_wait_min ?? 0),
    )
}

export const soonestCart = (carts: readonly CartWithSpot[]): CartWithSpot | null => openCartsBySoonest(carts)[0] ?? null

/** The open cart with the shortest wait other than `excludeId`, for "try a quieter cart". */
export function quieterCart(carts: readonly CartWithSpot[], excludeId: string | null): CartWithSpot | null {
  return (
    carts
      .filter((c) => c.id !== excludeId && c.is_open && c.next_window_start)
      .sort((a, b) => (a.live_wait_min ?? 0) - (b.live_wait_min ?? 0))[0] ?? null
  )
}

const METERS_PER_MILE = 1609.344
const FEET_PER_METER = 3.28084

/** "450 ft" under a tenth of a mile, else "0.3 mi". */
export function formatDistance(meters: number): string {
  const miles = meters / METERS_PER_MILE
  if (miles < 0.1) return `${Math.round((meters * FEET_PER_METER) / 50) * 50} ft`
  return `${miles.toFixed(1)} mi`
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** '13:05' → '1:05' (the gap's clock time as people say it). */
export function gapClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')}`
}

export interface GapSuggestion {
  windowId: string
  gap: ClassGap
}

/** The first open window that starts inside one of today's class gaps. */
export function suggestWindow(
  windows: readonly WindowWithSpots[],
  gaps: readonly ClassGap[],
  now: Date = new Date(),
): GapSuggestion | null {
  const today = gaps.filter((g) => g.day === campusWeekday(now)).sort((a, b) => a.start.localeCompare(b.start))
  for (const gap of today) {
    const from = toMinutes(gap.start)
    const to = toMinutes(gap.end)
    const w = windows.find((x) => {
      const start = campusMinutes(new Date(x.starts_at))
      return !x.is_full && start >= from && start < to
    })
    if (w) return { windowId: w.id, gap }
  }
  return null
}

/** The first window after `afterId` that still has a spot. */
export function nextOpenWindow(windows: readonly WindowWithSpots[], afterId: string): WindowWithSpots | null {
  const i = windows.findIndex((w) => w.id === afterId)
  return windows.slice(i + 1).find((w) => !w.is_full) ?? null
}

/** 299_000 → "4:59". */
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
