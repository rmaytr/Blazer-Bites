import { useMemo } from 'react'
import { MENU } from '@/demo/data'
import { getPilotHistory, type PilotHistory } from '@/demo/history'
import { computePilotStats, type PilotStats } from '@/demo/pilot'
import { useBooted } from './useDemo'

export interface PilotData extends PilotStats {
  /** The sample rows the figures come from (for the CSV export). */
  history: PilotHistory
}

/** Pilot dashboard figures (taste, time, price, viability) computed from two weeks of sample rows. */
export function usePilotStats(): { data: PilotData | undefined; loading: boolean; error: Error | null } {
  const ready = useBooted()
  const data = useMemo<PilotData>(() => {
    const history = getPilotHistory()
    return { ...computePilotStats(history, MENU), history }
  }, [])
  return { data: ready ? data : undefined, loading: !ready, error: null }
}
