import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSession } from '@/hooks/useSession'
import { takeNext } from '@/lib/redirect'
import { EmptyState, PageHeader, Skeleton, buttonClasses } from '@/components/ui'

const GIVE_UP_MS = 10_000

/** supabase-js exchanges the magic-link code on load (detectSessionInUrl); we wait for the session. */
export default function AuthCallback() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)
  const urlError = new URLSearchParams(window.location.search + window.location.hash.replace('#', '&')).get('error_description')

  useEffect(() => {
    if (session) navigate(takeNext(), { replace: true })
  }, [session, navigate])

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), GIVE_UP_MS)
    return () => clearTimeout(t)
  }, [])

  if (urlError || (timedOut && !session && !loading)) {
    return (
      <>
        <PageHeader title="Sign in" />
        <EmptyState
          title="That link didn't work"
          body="Sign-in links expire after a while and work once. Ask for a new one."
          action={
            <Link to="/signin" className={buttonClasses('primary')}>
              Send a new link
            </Link>
          }
        />
      </>
    )
  }

  return (
    <div aria-busy="true" aria-label="Signing you in" className="pt-6">
      <Skeleton className="h-9 w-1/2" />
      <Skeleton className="mt-4 h-24 w-full" />
    </div>
  )
}
