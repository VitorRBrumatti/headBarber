'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'

export async function createClient(formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('clients').insert({
    barbershop_id: barbershopId,
    name: formData.get('name') as string,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    notes: formData.get('notes') as string || null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard')
}

export async function updateClient(id: string, formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('clients').update({
    name: formData.get('name') as string,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    notes: formData.get('notes') as string || null,
  }).eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clientes')
}

export async function deleteClient(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('clients')
    .delete()
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/clientes')
  revalidatePath('/dashboard')
}
