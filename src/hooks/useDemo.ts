import { useMemo, useSyncExternalStore } from 'react'
import { getState, subscribe, type DemoState } from '@/demo/store'

export interface QueryState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  /** Kept for the old contract: demo data is always live, so this resolves immediately. */
  refetch: () => Promise<void>
}

/** First-load skeleton delay, once per app start (none in tests). */
const BOOT_MS = import.meta.env.MODE === 'test' ? 0 : 300
let booted = BOOT_MS === 0
const bootListeners = new Set<() => void>()

function subscribeBoot(l: () => void): () => void {
  bootListeners.add(l)
  if (!booted && bootListeners.size === 1) {
    setTimeout(() => {
      booted = true
      for (const fn of bootListeners) fn()
    }, BOOT_MS)
  }
  return () => bootListeners.delete(l)
}

/** False for the first ~300 ms after the app starts, so skeletons are visible once. */
export function useBooted(): boolean {
  return useSyncExternalStore(subscribeBoot, () => booted)
}

/** The whole demo state, live. Re-renders on every store change. */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getState)
}

const refetch = () => Promise.resolve()

/** Select from the live demo state; `deps` are the selector's other inputs. */
export function useDemoQuery<T>(select: (s: DemoState) => T, deps: readonly unknown[]): QueryState<T> {
  const state = useDemoState()
  const ready = useBooted()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- select is re-created each render; deps lists its inputs
  const data = useMemo(() => select(state), [state, ...deps])
  return { data: ready ? data : undefined, loading: !ready, error: null, refetch }
}
