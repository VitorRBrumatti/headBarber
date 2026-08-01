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

interface AgendaRangeAppointment {
  startAt: string
  endAt: string
}

export function getAgendaDisplayRange({
  defaultStartTime,
  defaultEndTime,
  intervalMinutes,
  appointments,
}: {
  defaultStartTime: string
  defaultEndTime: string
  intervalMinutes: number
  appointments: AgendaRangeAppointment[]
}) {
  const interval = intervalMinutes > 0 ? intervalMinutes : 30
  let start = timeToMinutes(defaultStartTime)
  let end = timeToMinutes(defaultEndTime)

  for (const appointment of appointments) {
    const appointmentStart = new Date(appointment.startAt)
    const appointmentEnd = new Date(appointment.endAt)
    if (
      Number.isNaN(appointmentStart.getTime()) ||
      Number.isNaN(appointmentEnd.getTime())
    ) {
      continue
    }

    const startMinutes =
      appointmentStart.getUTCHours() * 60 + appointmentStart.getUTCMinutes()
    const endMinutes =
      appointmentEnd.getUTCHours() * 60 + appointmentEnd.getUTCMinutes()
    start = Math.min(start, Math.floor(startMinutes / interval) * interval)
    end = Math.max(end, Math.ceil(endMinutes / interval) * interval)
  }

  return { startTime: minutesToTime(start), endTime: minutesToTime(end) }
}

export function getAppointmentGridPlacement({
  date,
  slots,
  intervalMinutes,
  startAt,
  endAt,
}: {
  date: string
  slots: string[]
  intervalMinutes: number
  startAt: string
  endAt: string
}) {
  if (slots.length === 0) return null

  const interval = intervalMinutes > 0 ? intervalMinutes : 30
  const intervalMs = interval * 60_000
  const gridStart = Date.parse(`${date}T${slots[0]}:00.000Z`)
  const gridEnd = gridStart + slots.length * intervalMs
  const appointmentStart = Date.parse(startAt)
  const appointmentEnd = Date.parse(endAt)

  if (
    !Number.isFinite(appointmentStart) ||
    !Number.isFinite(appointmentEnd) ||
    appointmentEnd <= gridStart ||
    appointmentStart >= gridEnd ||
    appointmentEnd <= appointmentStart
  ) {
    return null
  }

  const visibleStart = Math.max(appointmentStart, gridStart)
  const visibleEnd = Math.min(appointmentEnd, gridEnd)
  const slotIndex = Math.floor((visibleStart - gridStart) / intervalMs)
  const slotStart = gridStart + slotIndex * intervalMs
  const span = Math.max(1, Math.ceil((visibleEnd - slotStart) / intervalMs))

  return { slotIndex, span }
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

export function shouldShowUnavailableLabel(
  currentState: AgendaCellState,
  previousState?: AgendaCellState,
) {
  return currentState !== 'available' && currentState !== previousState
}
