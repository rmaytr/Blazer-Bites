import { useState } from 'react'
import { updateProfile } from '@/demo/controls'
import type { ClassGap, Weekday } from '@/types/app'

const DAYS: { id: Weekday; label: string }[] = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
]

const NEW_GAP: ClassGap = { day: 'mon', start: '11:50', end: '12:05' }

/** A gap is valid when both times are set and it ends after it starts ('HH:MM' compares as text). */
export const validGap = (g: ClassGap): boolean => /^\d{2}:\d{2}$/.test(g.start) && /^\d{2}:\d{2}$/.test(g.end) && g.end > g.start

const field = 'min-h-11 rounded-inner bg-raised px-3 text-[15px] num [&::-webkit-calendar-picker-indicator]:hidden'

interface ClassGapsEditorProps {
  gaps: ClassGap[]
  onSaved: () => void
}

/** Day + start/end rows. Saves itself whenever every row is valid; a bad row says why and waits. */
export function ClassGapsEditor({ gaps, onSaved }: ClassGapsEditorProps) {
  const [draft, setDraft] = useState(gaps)

  const commit = (next: ClassGap[]) => {
    setDraft(next)
    if (next.every(validGap)) {
      updateProfile({ class_gaps: next })
      onSaved()
    }
  }
  const change = (i: number, patch: Partial<ClassGap>) => commit(draft.map((g, j) => (j === i ? { ...g, ...patch } : g)))

  return (
    <div>
      {draft.length === 0 && <p className="text-[15px] text-muted">No gaps yet. Add one and we will suggest pickup times that fit it.</p>}
      <ul className="space-y-5">
        {draft.map((g, i) => {
          const bad = !validGap(g)
          const errId = `gap-${i}-err`
          return (
            <li key={i}>
              <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-x-2 gap-y-2">
                <select
                  aria-label={`Gap ${i + 1} day`}
                  value={g.day}
                  onChange={(e) => change(i, { day: e.target.value as Weekday })}
                  className={`${field} col-span-3`}
                >
                  {DAYS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  aria-label={`Gap ${i + 1} starts`}
                  value={g.start}
                  step={300}
                  onChange={(e) => change(i, { start: e.target.value })}
                  aria-invalid={bad || undefined}
                  aria-describedby={bad ? errId : undefined}
                  className={`${field} min-w-0`}
                />
                <span aria-hidden className="text-muted">
                  –
                </span>
                <input
                  type="time"
                  aria-label={`Gap ${i + 1} ends`}
                  value={g.end}
                  step={300}
                  onChange={(e) => change(i, { end: e.target.value })}
                  aria-invalid={bad || undefined}
                  aria-describedby={bad ? errId : undefined}
                  className={`${field} min-w-0`}
                />
                <button
                  type="button"
                  aria-label={`Remove gap ${i + 1}`}
                  onClick={() => commit(draft.filter((_, j) => j !== i))}
                  className="col-start-4 row-start-1 grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              {bad && (
                <p id={errId} className="mt-1 text-[13px] font-semibold text-danger-ink">
                  End after it starts. Not saved yet.
                </p>
              )}
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={() => commit([...draft, NEW_GAP])}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 -ml-3 text-[15px] font-semibold text-primary transition-colors hover:bg-raised"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add a gap
      </button>
    </div>
  )
}
