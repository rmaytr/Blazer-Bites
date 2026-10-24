// Error type shared by src/lib/api.ts and the demo store (src/demo). Codes match the archived RPCs.

export const API_ERROR_CODES = [
  'WINDOW_FULL',
  'HOLD_EXPIRED',
  'SOLD_OUT',
  'NOT_EXPRESS',
  'SIGNOFF_MISSING',
  'ALREADY_MOVED',
  'ALREADY_RATED',
  'NOT_PICKED_UP',
  'FORBIDDEN',
  'DEMO_DISABLED',
  'CART_CLOSED',
  'WINDOW_CLOSED',
  'NOT_FOUND',
  'INVALID_INPUT',
  'PAYMENT_FAILED',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number] | 'UNKNOWN'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'ApiError'
    this.code = code
  }
}

const text = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Map a PostgREST / Postgres error (raise exception 'WINDOW_FULL' ...) to an ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  const e = (typeof err === 'object' && err !== null ? err : {}) as Record<string, unknown>
  const message = text(e.message) || (err instanceof Error ? err.message : String(err))
  const haystack = [message, text(e.details), text(e.hint)].join(' ')
  const code = API_ERROR_CODES.find((c) => haystack.includes(c))
  if (code) return new ApiError(code, message, { cause: err })
  if (e.code === '42501' || /permission denied/i.test(haystack)) return new ApiError('FORBIDDEN', message, { cause: err })
  return new ApiError('UNKNOWN', message, { cause: err })
}
