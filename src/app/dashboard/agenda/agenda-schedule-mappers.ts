import type {
  AgendaBlock,
  AgendaWorkHour,
} from './agenda-grid-utils'

export interface AgendaSettings {
  slotIntervalMinutes: number
  defaultStartTime: string
  defaultEndTime: string
}

interface SettingsRow {
  slot_interval_minutes: number | null
  default_start_time: string | null
  default_end_time: string | null
}

interface WorkHourRow {
  barber_id: string
  start_time: string
  end_time: string
  lunch_start_time: string
  lunch_end_time: string
}

interface BlockRow {
  id: string
  barber_id: string
  start_at: string
  end_at: string
  reason: string | null
}

export function mapAgendaSettings(row: SettingsRow | null): AgendaSettings {
  return {
    slotIntervalMinutes: row?.slot_interval_minutes || 30,
    defaultStartTime: row?.default_start_time || '09:00:00',
    defaultEndTime: row?.default_end_time || '19:00:00',
  }
}

export function mapAgendaWorkHours(rows: WorkHourRow[]): AgendaWorkHour[] {
  return rows.map((row) => ({
    barberId: row.barber_id,
    startTime: row.start_time,
    endTime: row.end_time,
    lunchStartTime: row.lunch_start_time,
    lunchEndTime: row.lunch_end_time,
  }))
}

export function mapAgendaBlocks(rows: BlockRow[]): AgendaBlock[] {
  return rows.map((row) => ({
    id: row.id,
    barberId: row.barber_id,
    startAt: row.start_at,
    endAt: row.end_at,
    reason: row.reason,
  }))
}
