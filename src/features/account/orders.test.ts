import { describe, expect, it } from 'vitest'
import { isOpenOrder, needsRating, orderDay, reorderLines, stepIndex } from './orders'
import { validGap } from './ClassGapsEditor'
import type { OrderWithItems } from '@/types/app'

const item = (over: Partial<OrderWithItems['items'][number]>) =>
  ({ menu_item_id: 'tacos', variant: null, qty: 1, rated: false, ...over }) as OrderWithItems['items'][number]

describe('account order helpers', () => {
  it('orders the steps and puts cancelled outside them', () => {
    expect(stepIndex('received')).toBe(0)
    expect(stepIndex('picked_up')).toBe(3)
    expect(stepIndex('cancelled')).toBe(-1)
    expect(isOpenOrder('ready')).toBe(true)
    expect(isOpenOrder('picked_up')).toBe(false)
  })

  it('turns a past order into basket lines, keeping variants and quantities', () => {
    const lines = reorderLines({ items: [item({ qty: 2 }), item({ menu_item_id: 'rice-bowl', variant: 'Tofu' })] })
    expect(lines).toEqual([
      { menuItemId: 'tacos', qty: 2 },
      { menuItemId: 'rice-bowl', variant: 'Tofu', qty: 1 },
    ])
  })

  it('asks for a rating only on picked-up orders with an unrated dish', () => {
    expect(needsRating({ status: 'picked_up', items: [item({ rated: true }), item({})] })).toBe(true)
    expect(needsRating({ status: 'picked_up', items: [item({ rated: true })] })).toBe(false)
    expect(needsRating({ status: 'ready', items: [item({})] })).toBe(false)
  })

  it('names today and yesterday in campus time', () => {
    const now = new Date('2026-10-23T17:00:00Z')
    expect(orderDay('2026-10-23T16:00:00Z', now)).toBe('Today')
    expect(orderDay('2026-10-22T16:00:00Z', now)).toBe('Yesterday')
    expect(orderDay('2026-10-19T16:00:00Z', now)).toBe('Mon, Oct 19')
  })
})


describe('class gap validation', () => {
  it('needs both times and an end after the start', () => {
    expect(validGap({ day: 'mon', start: '11:50', end: '12:05' })).toBe(true)
    expect(validGap({ day: 'mon', start: '12:05', end: '11:50' })).toBe(false)
    expect(validGap({ day: 'mon', start: '', end: '12:05' })).toBe(false)
  })
})
