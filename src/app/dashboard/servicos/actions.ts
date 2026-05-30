'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'

export async function createService(formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('services').insert({
    barbershop_id: barbershopId,
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    price: parseFloat(formData.get('price') as string),
    duration_minutes: parseInt(formData.get('duration_minutes') as string),
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/servicos')
  revalidatePath('/dashboard')
}

export async function updateService(id: string, formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('services').update({
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    price: parseFloat(formData.get('price') as string),
    duration_minutes: parseInt(formData.get('duration_minutes') as string),
  }).eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/servicos')
}

export async function toggleServiceStatus(id: string, isActive: boolean) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('services')
    .update({ is_active: !isActive })
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/servicos')
}

export async function deleteService(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('services')
    .delete()
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/servicos')
  revalidatePath('/dashboard')
}
