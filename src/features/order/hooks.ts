import { useEffect, useState } from 'react'
import { DEMO_LOCATION, distanceMeters } from '@/demo/data'
import { useBasket } from '@/hooks/useBasket'
import { releaseHold } from '@/lib/api'

/** Date.now(), re-rendered every second (countdowns). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/** Milliseconds left on the bag's held spot, or null with no hold. */
export function useHoldLeft(): number | null {
  const { hold } = useBasket()
  const now = useNow()
  return hold ? Math.max(0, Date.parse(hold.expiresAt) - now) : null
}

export interface Place {
  lat: number
  lng: number
}

/** Further than this from campus, the real position is useless for "which cart is closest". */
const FAR_FROM_CAMPUS_M = 5000

/**
 * The student's position when location is already granted (never prompts), else the campus centre.
 */
export function useMyLocation(): Place {
  const [place, setPlace] = useState<Place>(DEMO_LOCATION)
  useEffect(() => {
    let live = true
    if (!navigator.permissions || !navigator.geolocation) return
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (!live || p.state !== 'granted') return
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const here = { lat: coords.latitude, lng: coords.longitude }
            if (live && distanceMeters(here, DEMO_LOCATION) < FAR_FROM_CAMPUS_M) setPlace(here)
          },
          () => undefined, // position unavailable: keep the campus centre
          { maximumAge: 60_000, timeout: 5000 },
        )
      })
      .catch(() => undefined) // permissions API refused the query: keep the campus centre
    return () => {
      live = false
    }
  }, [])
  return place
}

/** Move the bag (and its lines) to another cart; the old held spot is released. */
export function useSwitchCart(): (cartId: string) => void {
  const basket = useBasket()
  return (cartId) => {
    if (basket.cartId === cartId) return
    // A failed release is harmless: the hold expires by itself within 5 minutes.
    if (basket.holdId) releaseHold(basket.holdId).catch(() => undefined)
    basket.setHold(null)
    for (const line of basket.lines) basket.add(line, cartId)
  }
}
