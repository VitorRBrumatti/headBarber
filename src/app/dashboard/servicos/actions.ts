'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'
import { parseServiceFormData } from './service-validation'

async function saveService(
  serviceId: string | null,
  formData: FormData,
  mode: 'create' | 'edit',
) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data: barbers, error: barbersError } = await supabase
    .from('barbers')
    .select('id')
    .eq('barbershop_id', barbershopId)

  if (barbersError) throw new Error(barbersError.message)

  const allowedBarberIds = new Set((barbers ?? []).map((barber) => barber.id))
  const parsed = parseServiceFormData(formData, allowedBarberIds, mode)
  if (!parsed.success) {
    throw new Error(Object.values(parsed.errors)[0] || 'Dados inválidos.')
  }

  const { data, error } = await supabase.rpc('save_service_with_barbers', {
    p_service_id: serviceId,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_is_active: parsed.data.isActive,
    p_assignments: parsed.data.assignments,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/servicos')
  revalidatePath('/dashboard')
  return data as string
}

export async function createService(formData: FormData) {
  return saveService(null, formData, 'create')
}

export async function updateService(id: string, formData: FormData) {
  return saveService(id, formData, 'edit')
}

export async function toggleServiceStatus(id: string, isActive: boolean) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase
    .from('services')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/servicos')
}

export async function deleteService(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/servicos')
  revalidatePath('/dashboard')
}
