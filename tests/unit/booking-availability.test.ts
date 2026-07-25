import { describe, expect, it } from 'vitest'
import { filterBookableSlotsForDate } from '@/app/booking/[slug]/booking-availability'

describe('booking availability', () => {
  it('keeps the current minute and future slots in America/Sao_Paulo', () => {
    const now = new Date('2026-07-18T13:45:00.000Z')

    expect(
      filterBookableSlotsForDate(
        ['10:30', '10:45', '11:00'],
        '2026-07-18',
        now,
      ),
    ).toEqual(['10:45', '11:00'])
  })

  it('keeps 23:45 when it is the current minute', () => {
    const now = new Date('2026-07-19T02:45:00.000Z')
    expect(
      filterBookableSlotsForDate(['23:30', '23:45'], '2026-07-18', now),
    ).toEqual(['23:45'])
  })

  it('keeps midnight slots on the next local date', () => {
    const now = new Date('2026-07-19T02:45:00.000Z')
    expect(
      filterBookableSlotsForDate(['00:00', '00:15'], '2026-07-19', now),
    ).toEqual(['00:00', '00:15'])
  })

  it('returns no slots for a past local date', () => {
    const now = new Date('2026-07-19T13:00:00.000Z')
    expect(
      filterBookableSlotsForDate(['23:45'], '2026-07-18', now),
    ).toEqual([])
  })

  it('does not filter a future date using the current clock time', () => {
    const now = new Date('2026-07-18T22:45:00.000Z')
    expect(
      filterBookableSlotsForDate(['09:00', '09:15'], '2026-07-19', now),
    ).toEqual(['09:00', '09:15'])
  })
})
