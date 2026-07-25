import { describe, expect, it } from 'vitest'
import {
  mapAgendaBlocks,
  mapAgendaSettings,
  mapAgendaWorkHours,
} from '@/app/dashboard/agenda/agenda-schedule-mappers'

describe('agenda schedule mapping', () => {
  it('uses the configured schedule values', () => {
    expect(
      mapAgendaSettings({
        slot_interval_minutes: 15,
        default_start_time: '08:00:00',
        default_end_time: '20:00:00',
      }),
    ).toEqual({
      slotIntervalMinutes: 15,
      defaultStartTime: '08:00:00',
      defaultEndTime: '20:00:00',
    })
  })

  it('uses safe defaults when settings are missing', () => {
    expect(mapAgendaSettings(null)).toEqual({
      slotIntervalMinutes: 30,
      defaultStartTime: '09:00:00',
      defaultEndTime: '19:00:00',
    })
  })

  it('maps work hours and exceptional blocks to client-safe names', () => {
    expect(
      mapAgendaWorkHours([
        {
          barber_id: 'barber-1',
          start_time: '09:00:00',
          end_time: '18:00:00',
          lunch_start_time: '12:00:00',
          lunch_end_time: '13:00:00',
        },
      ]),
    ).toEqual([
      {
        barberId: 'barber-1',
        startTime: '09:00:00',
        endTime: '18:00:00',
        lunchStartTime: '12:00:00',
        lunchEndTime: '13:00:00',
      },
    ])

    expect(
      mapAgendaBlocks([
        {
          id: 'block-1',
          barber_id: 'barber-1',
          start_at: '2030-07-22T15:00:00.000Z',
          end_at: '2030-07-22T16:00:00.000Z',
          reason: 'Compromisso',
        },
      ]),
    ).toEqual([
      {
        id: 'block-1',
        barberId: 'barber-1',
        startAt: '2030-07-22T15:00:00.000Z',
        endAt: '2030-07-22T16:00:00.000Z',
        reason: 'Compromisso',
      },
    ])
  })
})
