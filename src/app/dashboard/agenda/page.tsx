import { AgendaClient } from './agenda-client'
import { getAgendaAppointments } from './actions'
import { getAgendaSchedule } from './agenda-data'

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
  const [appointmentData, scheduleData] = await Promise.all([
    getAgendaAppointments(targetDate),
    getAgendaSchedule(targetDate),
  ])

  return (
    <AgendaClient
      initialBarbers={appointmentData.barbers}
      initialAppointments={appointmentData.appointments}
      initialSettings={scheduleData.settings}
      initialWorkHours={scheduleData.workHours}
      initialBlocks={scheduleData.blocks}
      currentDate={targetDate}
    />
  )
}
