import { getBarbershopId } from '@/utils/get-barbershop'
import { mapAppointmentRows } from '../agenda/appointment-mappers'
import { ReservasClient } from './reservas-client'

export default async function ReservasPage() {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      barber_id,
      start_at,
      end_at,
      status,
      service_price,
      service_duration_minutes,
      total_price,
      notes,
      clients ( name, phone, email ),
      services ( name ),
      barbers ( name ),
      appointment_add_ons (
        price,
        duration_minutes,
        add_ons ( name )
      ),
      appointment_products (
        quantity,
        unit_price,
        status,
        products ( name, image_url )
      )
    `)
    .eq('barbershop_id', barbershopId)
    .order('start_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div className="space-y-6">
      <ReservasClient initialAppointments={mapAppointmentRows(data ?? [])} />
    </div>
  )
}
