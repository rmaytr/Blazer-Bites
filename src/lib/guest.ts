// Guest checkout and anonymous device state, kept in localStorage.
import type { GuestInfo } from '@/types/app'

const GUEST_KEY = 'bb:guest'
const DEVICE_KEY = 'bb:device'
const TOKENS_KEY = 'bb:orderTokens'
const MAX_TOKENS = 20

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback // private mode or corrupt value: behave as empty
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or blocked: the app still works for this session
  }
}

/** Phone is valid with 10 US digits (optionally a leading 1). */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
}

export function getGuest(): GuestInfo | null {
  const g = read<GuestInfo | null>(GUEST_KEY, null)
  return g && typeof g.name === 'string' && typeof g.phone === 'string' ? g : null
}

/** Saved with the phone as digits only: orders.guest_phone must match ^[0-9]{10,15}$. */
export function saveGuest(guest: GuestInfo): void {
  write(GUEST_KEY, { name: guest.name.trim(), phone: guest.phone.replace(/\D/g, '') })
}

export function clearGuest(): void {
  try {
    localStorage.removeItem(GUEST_KEY)
  } catch {
    // ignore
  }
}

/** Stable anonymous id used as the window-hold holder when not signed in. */
export function getDeviceId(): string {
  const existing = read<string | null>(DEVICE_KEY, null)
  if (existing) return existing
  const id = crypto.randomUUID()
  write(DEVICE_KEY, id)
  return id
}

/** Order access tokens this device placed, newest first (guests track orders this way). */
export function getOrderTokens(): string[] {
  return read<string[]>(TOKENS_KEY, []).filter((t) => typeof t === 'string')
}

export function rememberOrderToken(token: string): void {
  write(TOKENS_KEY, [token, ...getOrderTokens().filter((t) => t !== token)].slice(0, MAX_TOKENS))
}
