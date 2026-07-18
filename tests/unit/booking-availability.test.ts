import { describe, expect, it } from 'vitest'
import { filterBookableSlotsForDate } from '@/app/booking/[slug]/booking-availability'

describe('booking availability', () => {
  it('keeps the current slot and near-future slots in the barbershop timezone', () => {
    const now = new Date('2026-07-18T13:45:00.000Z') // 10:45 in Sao Paulo

    expect(
      filterBookableSlotsForDate(
        ['10:30', '10:45', '11:00'],
        '2026-07-18',
        now,
      ),
    ).toEqual(['10:45', '11:00'])
  })

  it('does not filter future dates using the current clock time', () => {
    const now = new Date('2026-07-18T22:45:00.000Z')

    expect(
      filterBookableSlotsForDate(['09:00', '09:15'], '2026-07-19', now),
    ).toEqual(['09:00', '09:15'])
  })
})
