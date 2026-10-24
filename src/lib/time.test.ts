import { describe, expect, it } from 'vitest'
import { formatTime, formatWindow, startOfCampusDay } from './time'

describe('startOfCampusDay', () => {
  it('is local midnight in Birmingham', () => {
    expect(startOfCampusDay(new Date('2026-10-23T16:00:00Z')).toISOString()).toBe('2026-10-23T05:00:00.000Z')
  })
  it('stays on the campus date late in the evening', () => {
    // 03:30Z on the 24th is still 22:30 on the 23rd in Birmingham
    expect(startOfCampusDay(new Date('2026-10-24T03:30:00Z')).toISOString()).toBe('2026-10-23T05:00:00.000Z')
  })
})

// Birmingham is America/Chicago: 16:30Z on 23 Oct 2026 is 11:30 CDT.
describe('formatTime', () => {
  it('formats in campus time', () => {
    expect(formatTime('2026-10-23T17:20:00Z')).toBe('12:20 PM')
  })
})

describe('formatWindow', () => {
  it('shares the period when both ends match', () => {
    expect(formatWindow('2026-10-23T16:30:00Z', '2026-10-23T16:40:00Z')).toBe('11:30–11:40 AM')
  })
  it('shows both periods across noon', () => {
    expect(formatWindow('2026-10-23T16:50:00Z', '2026-10-23T17:00:00Z')).toBe('11:50 AM–12:00 PM')
  })
  it('shows only the start without an end', () => {
    expect(formatWindow('2026-10-23T16:30:00Z')).toBe('11:30 AM')
  })
})
