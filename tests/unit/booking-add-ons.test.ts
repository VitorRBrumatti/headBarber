import { describe, expect, it } from 'vitest'
import {
  mapBarberAddOnRows,
  selectedAddOnPayload,
  toggleAddOnSelection,
} from '@/app/booking/[slug]/booking-add-ons'

describe('public barber add-ons', () => {
  const options = [
    {
      id: 'relation-a',
      barberId: 'barber-a',
      addOnId: 'addon-a',
      name: 'Sobrancelha',
      price: 10,
      durationMinutes: 5,
      configurationVersion: 2,
    },
  ]

  it('maps relationship values as authoritative numbers', () => {
    expect(
      mapBarberAddOnRows([
        {
          id: 'relation-a',
          barber_id: 'barber-a',
          add_on_id: 'addon-a',
          price: '10.00',
          duration_minutes: 5,
          configuration_version: '2',
          add_ons: { name: 'Sobrancelha' },
        },
      ]),
    ).toEqual(options)
  })

  it('toggles relationship ids and invalidates the schedule', () => {
    expect(
      toggleAddOnSelection(
        {
          selectedIds: [],
          date: '2026-07-25',
          time: '10:00',
          slots: ['10:00'],
        },
        'relation-a',
      ),
    ).toEqual({
      selectedIds: ['relation-a'],
      date: '',
      time: '',
      slots: [],
    })
  })

  it('serializes selected relationship ids with their loaded versions', () => {
    expect(selectedAddOnPayload(['relation-a'], options)).toEqual([
      { barberAddOnId: 'relation-a', configurationVersion: 2 },
    ])
  })
})
