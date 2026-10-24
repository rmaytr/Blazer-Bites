const NEXT_KEY = 'bb:authNext'

/** Only same-origin relative paths: blocks open redirects like //evil.com or https://... */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
}

export function rememberNext(next: string | null | undefined): void {
  try {
    sessionStorage.setItem(NEXT_KEY, safeNext(next))
  } catch {
    // falls back to home after sign-in
  }
}

export function takeNext(): string {
  try {
    const v = sessionStorage.getItem(NEXT_KEY)
    sessionStorage.removeItem(NEXT_KEY)
    return safeNext(v)
  } catch {
    return '/'
  }
}
