const DATE_TIME_LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

export function toAgendaIsoDateTime(value: string) {
  const match = DATE_TIME_LOCAL_PATTERN.exec(value)

  if (!match) {
    throw new Error('Data e horário de bloqueio inválidos.')
  }

  const [, year, month, day, hours, minutes] = match
  const isoDateTime = `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`
  const parsedDateTime = new Date(isoDateTime)

  if (
    Number.isNaN(parsedDateTime.getTime()) ||
    parsedDateTime.toISOString() !== isoDateTime
  ) {
    throw new Error('Data e horário de bloqueio inválidos.')
  }

  return isoDateTime
}
