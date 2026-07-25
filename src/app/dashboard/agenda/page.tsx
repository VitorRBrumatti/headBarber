import { AgendaClient } from './agenda-client'
import { getAgendaAppointments } from './actions'

interface PageProps {
  searchParams: Promise<{
    date?: string
  }>
}

function localIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const { date } = await searchParams
  const targetDate = date || localIsoDate(new Date())
  const data = await getAgendaAppointments(targetDate)

  return (
    <div className="space-y-6">
      <AgendaClient
        initialBarbers={data.barbers}
        initialAppointments={data.appointments}
        currentDate={targetDate}
      />
    </div>
  )
}
