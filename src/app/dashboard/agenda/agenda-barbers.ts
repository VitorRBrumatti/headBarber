interface AgendaBarberRow {
  id: string
  name: string
  bio: string | null
  avatar_url: string | null
  is_active: boolean
}

export function selectAgendaBarbers(
  rows: AgendaBarberRow[],
  appointments: { barberId: string }[],
) {
  const bookedBarberIds = new Set(
    appointments.map((appointment) => appointment.barberId),
  )

  return rows
    .filter((barber) => barber.is_active || bookedBarberIds.has(barber.id))
    .map((barber) => ({
      id: barber.id,
      name: barber.name,
      bio: barber.bio,
      avatarUrl: barber.avatar_url,
    }))
}
