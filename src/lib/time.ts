/** Campus time: UAB is in Birmingham, AL. */
export const TIME_ZONE = 'America/Chicago'

const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TIME_ZONE })

function parts(d: string | Date): { clock: string; period: string } {
  const p = fmt.formatToParts(new Date(d))
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? ''
  return { clock: `${get('hour')}:${get('minute')}`, period: get('dayPeriod').toUpperCase() }
}

const ymd = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE })
const offset = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })

/** Midnight of the current campus date, as an instant. */
export function startOfCampusDay(now: Date = new Date()): Date {
  // shortcut: uses the UTC offset at `now`, so it is an hour off on the two DST-switch days; fine for "today's orders".
  const gmt = offset.formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const tz = gmt === 'GMT' ? 'Z' : gmt.replace('GMT', '')
  return new Date(`${ymd.format(now)}T00:00:00${tz}`)
}

/** "12:20 PM" in campus time. */
export function formatTime(d: string | Date): string {
  const { clock, period } = parts(d)
  return `${clock} ${period}`
}

/** "11:30–11:40 AM", or "11:50 AM–12:00 PM" across noon, or "11:30 AM" with no end. */
export function formatWindow(startsAt: string | Date, endsAt?: string | Date | null): string {
  const a = parts(startsAt)
  if (!endsAt) return `${a.clock} ${a.period}`
  const b = parts(endsAt)
  return a.period === b.period ? `${a.clock}–${b.clock} ${b.period}` : `${a.clock} ${a.period}–${b.clock} ${b.period}`
}
