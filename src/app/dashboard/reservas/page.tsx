import { getBarbershopId } from '@/utils/get-barbershop'
import { mapAppointmentRows } from '../agenda/appointment-mappers'
import { ReservasClient } from './reservas-client'

export default async function ReservasPage() {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data, error } = await supabase
    .from('appointments')
    .select(
      `
      id,
      barber_id,
      start_at,
      end_at,
      status,
      service_price,
      service_duration_minutes,
      total_price,
      subscription_covered_total,
      amount_due,
      subscription_coverage_status,
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
      ),
      appointment_subscription_allocations (
        status,
        subscription_cycle_entitlements (
          item_name_snapshot,
          subscription_cycles ( plan_name_snapshot )
        )
      )
    `,
    )
    .eq('barbershop_id', barbershopId)
    .order('start_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div className="space-y-6">
      <ReservasClient initialAppointments={mapAppointmentRows(data ?? [])} />
    </div>
  )
}
