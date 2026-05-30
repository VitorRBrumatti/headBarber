import { getAgendaAppointments } from './actions'
import { AgendaClient } from './agenda-client'
import { createClient } from '@/utils/supabase/server'

interface PageProps {
  searchParams: Promise<{
    date?: string
  }>
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  
  // Format current date in YYYY-MM-DD local time representation
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  const defaultDate = `${year}-${month}-${day}`

  const targetDate = resolvedParams.date || defaultDate

  // Fetch agenda data
  const data = await getAgendaAppointments(targetDate)

  // Fetch active services for the admin quick creation form
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let services: { id: string; name: string; price: number }[] = []
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', user.id)
      .single()

    if (profile?.barbershop_id) {
      const { data: activeServices } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('barbershop_id', profile.barbershop_id)
        .eq('is_active', true)
        .order('name')
      
      services = activeServices || []
    }
  }

  return (
    <div className="space-y-6">
      <AgendaClient 
        initialBarbers={data.barbers}
        initialSettings={data.settings}
        initialAppointments={data.appointments}
        initialWorkHours={data.workHours}
        currentDate={targetDate}
        services={services}
      />
    </div>
  )
}