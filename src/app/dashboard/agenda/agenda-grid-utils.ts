export interface AgendaWorkHour {
  barberId: string
  startTime: string
  endTime: string
  lunchStartTime: string
  lunchEndTime: string
}

export interface AgendaBlock {
  id: string
  barberId: string
  startAt: string
  endAt: string
  reason: string | null
}

export type AgendaCellState = 'available' | 'lunch' | 'blocked' | 'off'

export interface AgendaCellInput {
  barberId: string
  date: string
  time: string
  intervalMinutes: number
  workHour?: AgendaWorkHour
  blocks: AgendaBlock[]
}

function timeToMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const minutes = String(totalMinutes % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

function overlaps(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number,
) {
  return firstStart < secondEnd && firstEnd > secondStart
}

export function generateAgendaSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number,
) {
  const slots: string[] = []
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)
  const interval = intervalMinutes > 0 ? intervalMinutes : 30

  for (let current = start; current < end; current += interval) {
    slots.push(minutesToTime(current))
  }

  return slots
}

export function getAppointmentSpan(
  startAt: string,
  endAt: string,
  intervalMinutes: number,
) {
  const durationMinutes = (Date.parse(endAt) - Date.parse(startAt)) / 60_000
  const interval = intervalMinutes > 0 ? intervalMinutes : 30
  return Math.max(1, Math.ceil(durationMinutes / interval))
}

export function getAgendaCellState({
  barberId,
  date,
  time,
  intervalMinutes,
  workHour,
  blocks,
}: AgendaCellInput): AgendaCellState {
  if (!workHour) return 'off'

  const slotStart = timeToMinutes(time)
  const slotEnd = slotStart + (intervalMinutes > 0 ? intervalMinutes : 30)
  const workStart = timeToMinutes(workHour.startTime)
  const workEnd = timeToMinutes(workHour.endTime)

  if (slotStart < workStart || slotEnd > workEnd) return 'off'

  const lunchStart = timeToMinutes(workHour.lunchStartTime)
  const lunchEnd = timeToMinutes(workHour.lunchEndTime)
  if (overlaps(slotStart, slotEnd, lunchStart, lunchEnd)) return 'lunch'

  const interval = intervalMinutes > 0 ? intervalMinutes : 30
  const slotStartAt = Date.parse(`${date}T${time}:00.000Z`)
  const slotEndAt = slotStartAt + interval * 60_000
  const isBlocked = blocks.some(
    (block) =>
      block.barberId === barberId &&
      slotStartAt < Date.parse(block.endAt) &&
      slotEndAt > Date.parse(block.startAt),
  )

  return isBlocked ? 'blocked' : 'available'
}
