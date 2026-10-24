import { RULES, type Rules } from '@/config/rules'

/** Fewer ratings than this in the window and a dish is not flagged either way. */
export const MIN_RATINGS_FOR_FLAG = 5

const DAY_MS = 86_400_000

export interface RatingStats {
  avg: number | null
  count: number
}

export type DishFlag = 'cut' | 'promote' | null

/** Average and count of the ratings made within the last `days`. */
export function ratingsInWindow(
  ratings: readonly { stars: number; created_at: string }[],
  days: number = RULES.cutDays,
  now: Date = new Date(),
): RatingStats {
  const since = now.getTime() - days * DAY_MS
  const recent = ratings.filter((r) => new Date(r.created_at).getTime() >= since)
  if (recent.length === 0) return { avg: null, count: 0 }
  return { avg: recent.reduce((s, r) => s + r.stars, 0) / recent.length, count: recent.length }
}

/** 'cut' if under the cut threshold, 'promote' if a special at or over the fixed-menu bar. */
export function dishFlag(
  { avg, count, isSpecial }: RatingStats & { isSpecial: boolean },
  rules: Pick<Rules, 'cutThreshold' | 'fixedMenuThreshold'> = RULES,
): DishFlag {
  if (avg === null || count < MIN_RATINGS_FOR_FLAG) return null
  if (avg < rules.cutThreshold) return 'cut'
  if (isSpecial && avg >= rules.fixedMenuThreshold) return 'promote'
  return null
}
