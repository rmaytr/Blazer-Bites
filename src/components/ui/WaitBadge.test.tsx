import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RULES } from '@/config/rules'
import { WaitBadge } from './WaitBadge'

vi.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ data: RULES, loading: false, error: null }) }))

describe('WaitBadge', () => {
  it('shows the wait in minutes', () => {
    render(<WaitBadge waitMin={3.2} nextWindowStart={null} />)
    expect(screen.getByRole('status')).toHaveAccessibleName('4 minutes wait')
  })
  it('never shows a number over 10: full with the next window instead', () => {
    render(<WaitBadge waitMin={14} nextWindowStart="2026-10-23T17:20:00Z" />)
    expect(screen.getByText('Full right now')).toBeInTheDocument()
    expect(screen.getByText('Next window 12:20 PM')).toBeInTheDocument()
    expect(screen.queryByText('14')).not.toBeInTheDocument()
  })
  it('says no wait for an empty cart', () => {
    render(<WaitBadge waitMin={0} nextWindowStart={null} />)
    expect(screen.getByText('No wait')).toBeInTheDocument()
  })
})
