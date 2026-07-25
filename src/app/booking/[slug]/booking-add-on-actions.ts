'use server'

import { createClient } from '@/utils/supabase/server'
import { mapBarberAddOnRows } from './booking-add-ons'

export async function getBarberAddOnsAction(
  barbershopId: string,
  barberId: string,
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('barber_add_ons')
    .select(
      'id, barber_id, add_on_id, price, duration_minutes, configuration_version, add_ons!inner(name)',
    )
    .eq('barbershop_id', barbershopId)
    .eq('barber_id', barberId)
    .eq('is_available', true)
    .eq('add_ons.is_active', true)
    .order('name', { referencedTable: 'add_ons' })

  if (error) {
    console.error('Error loading barber add-ons:', error.message)
    return {
      success: false as const,
      error: 'Não foi possível carregar os adicionais deste profissional.',
    }
  }

  return {
    success: true as const,
    addOns: mapBarberAddOnRows(data || []),
  }
}
