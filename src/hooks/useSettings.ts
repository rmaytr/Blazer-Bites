import { RULES, type Rules } from '@/config/rules'

/** Operating rules (src/config/rules.ts). Same shape as when they came from the settings table. */
export function useSettings(): { data: Rules; loading: boolean; error: Error | null } {
  return { data: RULES, loading: false, error: null }
}
