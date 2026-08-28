import { describe, expect, it } from 'vitest'
import { toAgendaIsoDateTime } from '@/app/dashboard/configuracoes/blocked-time-utils'
import { getAgendaCellState } from '@/app/dashboard/agenda/agenda-grid-utils'

const workHour = {
  barberId: 'barber-1',
  startTime: '09:00:00',
  endTime: '19:00:00',
  lunchStartTime: '13:00:00',
  lunchEndTime: '14:00:00',
}

describe('blocked time timezone regression', () => {
  it('keeps a 09:00-12:00 datetime-local block at the same agenda hours', () => {
    const block = {
      id: 'block-1',
      barberId: 'barber-1',
      startAt: toAgendaIsoDateTime('2030-07-22T09:00'),
      endAt: toAgendaIsoDateTime('2030-07-22T12:00'),
      reason: 'Compromisso',
    }

    expect(block.startAt).toBe('2030-07-22T09:00:00.000Z')
    expect(block.endAt).toBe('2030-07-22T12:00:00.000Z')
    expect(
      getAgendaCellState({
        barberId: 'barber-1',
        date: '2030-07-22',
        time: '09:00',
        intervalMinutes: 30,
        workHour,
        blocks: [block],
      }),
    ).toBe('blocked')
    expect(
      getAgendaCellState({
        barberId: 'barber-1',
        date: '2030-07-22',
        time: '12:00',
        intervalMinutes: 30,
        workHour,
        blocks: [block],
      }),
    ).toBe('available')
  })

  it('rejects invalid datetime-local values', () => {
    expect(() => toAgendaIsoDateTime('2030-02-30T09:00')).toThrow(
      'Data e horário de bloqueio inválidos.',
    )
  })
})
