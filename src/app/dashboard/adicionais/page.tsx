import { getBarbershopId } from '@/utils/get-barbershop'
import { mapAddOnCatalogRows, type AddOnRow } from './add-on-mappers'
import type { AddOnBarber } from './add-on-types'
import { AdicionaisClient } from './adicionais-client'

interface BarberRow {
  id: string
  name: string
  is_active: boolean
}

export default async function AdicionaisPage() {
  const { supabase, barbershopId } = await getBarbershopId()
  const [addOnsResult, barbersResult] = await Promise.all([
    supabase
      .from('add_ons')
      .select(
        'id, name, is_active, barber_add_ons(id, barber_id, price, duration_minutes, is_available, configuration_version)',
      )
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false }),
    supabase
      .from('barbers')
      .select('id, name, is_active')
      .eq('barbershop_id', barbershopId)
      .order('name'),
  ])

  if (addOnsResult.error) throw new Error(addOnsResult.error.message)
  if (barbersResult.error) throw new Error(barbersResult.error.message)

  const addOns = mapAddOnCatalogRows(
    (addOnsResult.data ?? []) as AddOnRow[],
  )
  const barbers: AddOnBarber[] = (
    (barbersResult.data ?? []) as BarberRow[]
  ).map((barber) => ({
    id: barber.id,
    name: barber.name,
    isActive: barber.is_active,
  }))

  return (
    <div className="space-y-6">
      <AdicionaisClient addOns={addOns} barbers={barbers} />
    </div>
  )
}
