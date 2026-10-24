// Operating rules (spec section 2). These are the defaults; the live values come from the
// `settings` table (admin-editable) via useSettings(). Keep in sync with the settings seed.

export interface Rules {
  windowMin: number
  ordersPerWindow: number
  walkupCutoff: number
  maxWaitMin: number
  surgeTriggerMin: number
  surgeWindows: number
  expressSize: number
  cutThreshold: number
  cutDays: number
  fixedMenuThreshold: number
  loyaltyEvery: number
  holdMin: number
  avgWalkupServiceSec: number
  defaultHandoffSec: number
  demoMode: boolean
}

export const RULES: Readonly<Rules> = Object.freeze({
  windowMin: 10,
  ordersPerWindow: 25,
  walkupCutoff: 15,
  maxWaitMin: 10,
  surgeTriggerMin: 6,
  surgeWindows: 2,
  expressSize: 2,
  cutThreshold: 4.0,
  cutDays: 14,
  fixedMenuThreshold: 4.3,
  loyaltyEvery: 10,
  holdMin: 5,
  avgWalkupServiceSec: 45,
  defaultHandoffSec: 30,
  demoMode: true,
})

/** snake_case column for each rule. */
const COLUMNS: { [K in keyof Rules]: string } = {
  windowMin: 'window_min',
  ordersPerWindow: 'orders_per_window',
  walkupCutoff: 'walkup_cutoff',
  maxWaitMin: 'max_wait_min',
  surgeTriggerMin: 'surge_trigger_min',
  surgeWindows: 'surge_windows',
  expressSize: 'express_size',
  cutThreshold: 'cut_threshold',
  cutDays: 'cut_days',
  fixedMenuThreshold: 'fixed_menu_threshold',
  loyaltyEvery: 'loyalty_every',
  holdMin: 'hold_min',
  avgWalkupServiceSec: 'avg_walkup_service_sec',
  defaultHandoffSec: 'default_handoff_sec',
  demoMode: 'demo_mode',
}

/** Map a (possibly partial) settings row to Rules, falling back to RULES per column. */
export function rulesFromSettings(row: Partial<Record<string, unknown>> | null | undefined): Rules {
  const out: Rules = { ...RULES }
  if (!row) return out
  for (const key of Object.keys(COLUMNS) as (keyof Rules)[]) {
    const raw = row[COLUMNS[key]]
    if (raw === null || raw === undefined) continue
    if (key === 'demoMode') out.demoMode = Boolean(raw)
    else {
      const n = Number(raw) // numeric columns arrive as strings from PostgREST
      if (Number.isFinite(n)) out[key] = n
    }
  }
  return out
}
