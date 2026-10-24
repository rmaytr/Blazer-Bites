import { useDemoState } from './useDemo'
import type { DemoSettings } from '@/demo/store'

/** Demo switches (autoAdvance). Change them with setAutoAdvance from '@/demo/controls'. */
export function useDemoSettings(): DemoSettings {
  return useDemoState().settings
}
