import { describe, expect, it } from 'vitest'
import {
  generateAgendaSlots,
  getAgendaCellState,
  getAppointmentSpan,
  shouldShowUnavailableLabel,
  type AgendaBlock,
  type AgendaWorkHour,
} from '@/app/dashboard/agenda/agenda-grid-utils'

const workHour: AgendaWorkHour = {
  barberId: 'barber-1',
  startTime: '09:00:00',
  endTime: '18:00:00',
  lunchStartTime: '12:00:00',
  lunchEndTime: '13:00:00',
}

const block: AgendaBlock = {
  id: 'block-1',
  barberId: 'barber-1',
  startAt: '2030-07-22T15:00:00.000Z',
  endAt: '2030-07-22T16:00:00.000Z',
  reason: 'Compromisso',
}

describe('agenda grid time slots', () => {
  it('generates configured intervals without including closing time', () => {
    expect(generateAgendaSlots('09:00:00', '10:30:00', 30)).toEqual([
      '09:00',
      '09:30',
      '10:00',
    ])
  })

  it('falls back to thirty minutes for an invalid interval', () => {
    expect(generateAgendaSlots('09:00:00', '10:00:00', 0)).toEqual([
      '09:00',
      '09:30',
    ])
  })

  it('spans an appointment across every interval it occupies', () => {
    expect(
      getAppointmentSpan(
        '2030-07-22T09:00:00.000Z',
        '2030-07-22T10:15:00.000Z',
        30,
      ),
    ).toBe(3)
  })
})

describe('agenda grid cell availability', () => {
  const baseInput = {
    barberId: 'barber-1',
    date: '2030-07-22',
    intervalMinutes: 30,
    workHour,
    blocks: [block],
  }

  it('keeps a working slot available', () => {
    expect(getAgendaCellState({ ...baseInput, time: '10:00' })).toBe(
      'available',
    )
  })

  it('marks lunch intervals as unavailable', () => {
    expect(getAgendaCellState({ ...baseInput, time: '12:30' })).toBe('lunch')
  })

  it('marks exceptional blocks as unavailable', () => {
    expect(getAgendaCellState({ ...baseInput, time: '15:30' })).toBe('blocked')
  })

  it('marks slots outside the shift as unavailable', () => {
    expect(getAgendaCellState({ ...baseInput, time: '08:30' })).toBe('off')
    expect(getAgendaCellState({ ...baseInput, time: '17:45' })).toBe('off')
  })

  it('treats a missing active shift as a day off', () => {
    expect(
      getAgendaCellState({ ...baseInput, time: '10:00', workHour: undefined }),
    ).toBe('off')
  })
})

describe('agenda unavailable labels', () => {
  it('shows a label when an unavailable period starts', () => {
    expect(shouldShowUnavailableLabel('lunch', 'available')).toBe(true)
    expect(shouldShowUnavailableLabel('blocked', 'lunch')).toBe(true)
  })

  it('hides a repeated label inside the same unavailable period', () => {
    expect(shouldShowUnavailableLabel('lunch', 'lunch')).toBe(false)
    expect(shouldShowUnavailableLabel('off', 'off')).toBe(false)
  })

  it('does not show an unavailable label for an available slot', () => {
    expect(shouldShowUnavailableLabel('available', 'off')).toBe(false)
  })
})
