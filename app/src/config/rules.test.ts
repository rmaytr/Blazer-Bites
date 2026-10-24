import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { RULES, rulesFromSettings } from './rules'

const SEED = 'archive/backend/supabase/seed.sql'

describe.runIf(existsSync(SEED))('RULES vs the settings seed', () => {
  it('match column for column', () => {
    const sql = readFileSync(SEED, 'utf8')
    const m = /insert into public\.settings \(([^)]*)\)\s*values \(([^)]*)\)/i.exec(sql)
    expect(m, 'settings insert not found in seed.sql').not.toBeNull()
    const cols = m![1].split(',').map((s) => s.trim())
    const vals = m![2].split(',').map((s) => s.trim())
    const row = Object.fromEntries(cols.map((c, i) => [c, vals[i] === 'true' ? true : vals[i] === 'false' ? false : Number(vals[i])]))
    expect(rulesFromSettings(row)).toEqual(RULES)
  })
})

describe('RULES', () => {
  it('defaults match spec section 2', () => {
    expect(RULES.windowMin).toBe(10)
    expect(RULES.ordersPerWindow).toBe(25)
    expect(RULES.walkupCutoff).toBe(15)
    expect(RULES.maxWaitMin).toBe(10)
    expect(RULES.surgeTriggerMin).toBe(6)
    expect(RULES.surgeWindows).toBe(2)
    expect(RULES.expressSize).toBe(2)
    expect(RULES.cutThreshold).toBe(4.0)
    expect(RULES.cutDays).toBe(14)
    expect(RULES.fixedMenuThreshold).toBe(4.3)
    expect(RULES.loyaltyEvery).toBe(10)
    expect(RULES.holdMin).toBe(5)
  })

  it('maps a settings row to camelCase rules and falls back for missing columns', () => {
    const rules = rulesFromSettings({ window_min: 12, orders_per_window: 20, demo_mode: false })
    expect(rules.windowMin).toBe(12)
    expect(rules.ordersPerWindow).toBe(20)
    expect(rules.demoMode).toBe(false)
    expect(rules.maxWaitMin).toBe(RULES.maxWaitMin)
  })

  it('reads numeric columns that PostgREST returns as strings', () => {
    expect(rulesFromSettings({ cut_threshold: '3.9' as unknown as number }).cutThreshold).toBe(3.9)
  })
})
