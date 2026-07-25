'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'
import { parseAddOnFormData } from './add-on-validation'

async function saveAddOn(
  addOnId: string | null,
  formData: FormData,
  mode: 'create' | 'edit',
) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data: barbers, error: barbersError } = await supabase
    .from('barbers')
    .select('id')
    .eq('barbershop_id', barbershopId)

  if (barbersError) throw new Error(barbersError.message)

  const parsed = parseAddOnFormData(
    formData,
    new Set((barbers ?? []).map((barber) => barber.id)),
    mode,
  )
  if (!parsed.success) {
    throw new Error(Object.values(parsed.errors)[0] || 'Dados inválidos.')
  }

  const { data, error } = await supabase.rpc('save_add_on_with_barbers', {
    p_add_on_id: addOnId,
    p_name: parsed.data.name,
    p_is_active: parsed.data.isActive,
    p_assignments: parsed.data.assignments,
  })
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/adicionais')
  revalidatePath('/dashboard')
  return data as string
}

export async function createAddOn(formData: FormData) {
  return saveAddOn(null, formData, 'create')
}

export async function updateAddOn(id: string, formData: FormData) {
  return saveAddOn(id, formData, 'edit')
}

export async function toggleAddOnStatus(id: string, isActive: boolean) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase
    .from('add_ons')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/adicionais')
  revalidatePath('/dashboard')
}

export async function deleteAddOn(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase
    .from('add_ons')
    .delete()
    .eq('id', id)
    .eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/adicionais')
  revalidatePath('/dashboard')
}
