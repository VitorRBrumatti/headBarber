import { createClient } from '@/utils/supabase/server'
import { ReservasClient } from './reservas-client'

export default async function ReservasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let appointments: any[] = []

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', user.id)
      .single()

    if (profile?.barbershop_id) {
      // Query all appointments (upcoming & history)
      const { data } = await supabase
        .from('appointments')
        .select(`
          id,
          start_at,
          end_at,
          status,
          total_price,
          notes,
          clients ( name, phone, email ),
          services ( name ),
          barbers ( name )
        `)
        .eq('barbershop_id', profile.barbershop_id)
        .order('start_at', { ascending: false })

      appointments = data || []
    }
  }

  return (
    <div className="space-y-6">
      <ReservasClient initialAppointments={appointments} />
    </div>
  )
}