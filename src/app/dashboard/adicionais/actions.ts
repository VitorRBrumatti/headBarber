'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'

export async function createAddOn(formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('add_ons').insert({
    barbershop_id: barbershopId,
    name: formData.get('name') as string,
    price: parseFloat(formData.get('price') as string),
    duration_minutes: parseInt(formData.get('duration_minutes') as string) || 0,
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/adicionais')
  revalidatePath('/dashboard')
}

export async function updateAddOn(id: string, formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('add_ons').update({
    name: formData.get('name') as string,
    price: parseFloat(formData.get('price') as string),
    duration_minutes: parseInt(formData.get('duration_minutes') as string) || 0,
  }).eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/adicionais')
}

export async function toggleAddOnStatus(id: string, isActive: boolean) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('add_ons')
    .update({ is_active: !isActive })
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/adicionais')
}

export async function deleteAddOn(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('add_ons')
    .delete()
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/adicionais')
  revalidatePath('/dashboard')
}
