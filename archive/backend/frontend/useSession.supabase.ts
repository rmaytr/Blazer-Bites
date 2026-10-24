import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useQuery } from './useQuery'
import type { Profile, Role } from '@/types/app'

export interface SessionState {
  session: Session | null
  profile: Profile | null
  /** null when signed out; 'student' until the profile row loads. */
  role: Role | null
  loading: boolean
}

export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setSession(data.session)
      })
      .finally(() => {
        if (alive) setAuthLoading(false)
      })
    // Only set state here: calling supabase inside this callback can deadlock the auth lock.
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setAuthLoading(false)
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [])

  const uid = session?.user.id ?? null
  const profile = useQuery(uid ? `profile:${uid}` : null, async () => {
    const { data, error } = await supabase.from('users').select('*').eq('id', uid as string).maybeSingle()
    if (error) throw error
    return data
  })

  return {
    session,
    profile: profile.data ?? null,
    role: session ? (profile.data?.role ?? 'student') : null,
    loading: authLoading || (uid !== null && profile.loading),
  }
}
