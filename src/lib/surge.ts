import { RULES } from '@/config/rules'

/**
 * Surge when the max wait in each of the last `windows` pickup windows ran over `triggerMin`.
 * `windowMaxWaits` is chronological, one value per window.
 */
export function shouldSurge(
  windowMaxWaits: readonly number[],
  triggerMin: number = RULES.surgeTriggerMin,
  windows: number = RULES.surgeWindows,
): boolean {
  if (windows < 1 || windowMaxWaits.length < windows) return false
  return windowMaxWaits.slice(-windows).every((w) => w > triggerMin)
}
