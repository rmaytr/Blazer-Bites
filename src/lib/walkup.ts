import { RULES } from '@/config/rules'

export interface WalkupState {
  walkupLine: number
  waitMin: number
}

/** Stop walk-ups once the line passes the cutoff or the wait passes the max. */
export function shouldStopWalkups(
  { walkupLine, waitMin }: WalkupState,
  cutoff: number = RULES.walkupCutoff,
  maxWaitMin: number = RULES.maxWaitMin,
): boolean {
  return walkupLine > cutoff || waitMin > maxWaitMin
}
