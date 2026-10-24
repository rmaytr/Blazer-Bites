import { useEffect, useRef } from 'react'
import { toast } from '@/components/ui'
import type { OrderStatus } from '@/types/app'

const BUZZ_MS = [200, 100, 200]

/**
 * Demo stand-in for web push: when the order turns Ready while this screen is open,
 * a toast and a vibration (where the browser supports it). Not on first render.
 */
export function useReadyAlert(status: OrderStatus | undefined, cartName: string, enabled: boolean): void {
  const prev = useRef(status)
  useEffect(() => {
    const was = prev.current
    prev.current = status
    if (!enabled || was === undefined || was === status || status !== 'ready') return
    toast.success('Your food is ready', { description: `Show your code at ${cartName}.` })
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(BUZZ_MS)
  }, [status, cartName, enabled])
}
