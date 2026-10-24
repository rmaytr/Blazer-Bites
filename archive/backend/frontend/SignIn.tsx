import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { supabase } from '@/lib/supabase'
import { getGuest, isValidPhone, saveGuest } from '@/lib/guest'
import { rememberNext, safeNext } from '@/lib/redirect'
import { Button, Card, PageHeader } from '@/components/ui'

const field =
  'mt-1.5 block min-h-12 w-full rounded-2xl bg-raised px-4 text-base text-ink placeholder:text-muted outline-none focus-visible:outline-3 focus-visible:outline-focus'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function MagicLinkForm({ next }: { next: string }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!EMAIL_RE.test(address)) {
      setError('Enter an email address like you@uab.edu.')
      return
    }
    setSending(true)
    setError(null)
    rememberNext(next)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setSending(false)
    if (err) setError("We couldn't send the link. Check the address and try again.")
    else setSentTo(address)
  }

  if (sentTo) {
    return (
      <div role="status">
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="mt-1 text-base text-muted">
          We sent a sign-in link to <span className="font-semibold text-ink">{sentTo}</span>. Open it on this phone.
        </p>
        <Button variant="ghost" className="mt-3 -ml-3" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 className="text-xl font-bold">Sign in with email</h2>
      <p className="mt-1 text-base text-muted">No password. Use your @uab.edu address to get the UAB badge.</p>
      <label className="mt-4 block text-base font-semibold" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        className={field}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@uab.edu"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && (
        <p id="email-error" role="alert" className="mt-2 text-base text-danger-ink">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-4" loading={sending}>
        Email me a sign-in link
      </Button>
    </form>
  )
}

function GuestForm({ next }: { next: string }) {
  const navigate = useNavigate()
  const saved = getGuest()
  const [name, setName] = useState(saved?.name ?? '')
  const [phone, setPhone] = useState(saved?.phone ?? '')
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Add the name we should call at the cart.')
    if (!isValidPhone(phone)) return setError('Add a 10-digit phone number.')
    saveGuest({ name, phone })
    navigate(next, { replace: true })
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 className="text-xl font-bold">Order as a guest</h2>
      <p className="mt-1 text-base text-muted">Just a name and phone number. No account needed.</p>
      <label className="mt-4 block text-base font-semibold" htmlFor="guest-name">
        Name
      </label>
      <input id="guest-name" autoComplete="given-name" className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      <label className="mt-3 block text-base font-semibold" htmlFor="guest-phone">
        Phone
      </label>
      <input
        id="guest-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        className={field}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="205 555 0123"
        aria-describedby={error ? 'guest-error' : undefined}
      />
      {error && (
        <p id="guest-error" role="alert" className="mt-2 text-base text-danger-ink">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" size="lg" className="mt-4">
        Continue as guest
      </Button>
    </form>
  )
}

export default function SignIn() {
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  return (
    <>
      <PageHeader title="Sign in" subtitle="Track orders, collect punches, reorder in one tap." back="/" />
      <div className="space-y-3">
        <Card>
          <MagicLinkForm next={next} />
        </Card>
        <Card>
          <GuestForm next={next} />
        </Card>
      </div>
    </>
  )
}
