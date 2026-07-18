const BARBERSHOP_TIME_ZONE = 'America/Sao_Paulo'

function getZonedDateAndMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  }
}

export function filterBookableSlotsForDate(
  slots: string[],
  targetDate: string,
  now = new Date(),
) {
  const current = getZonedDateAndMinutes(now, BARBERSHOP_TIME_ZONE)

  if (targetDate !== current.date) return slots

  return slots.filter((slot) => {
    const [hour, minute] = slot.split(':').map(Number)
    return hour * 60 + minute >= current.minutes
  })
}
