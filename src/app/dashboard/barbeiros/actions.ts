'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

async function getBarbershopId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('barbershop_id')
    .eq('id', user.id)
    .single()
  if (!profile?.barbershop_id) throw new Error('Sem barbearia associada')
  return { supabase, barbershopId: profile.barbershop_id }
}

export async function createBarber(formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('barbers').insert({
    barbershop_id: barbershopId,
    name: formData.get('name') as string,
    bio: formData.get('bio') as string,
    avatar_url: formData.get('avatar_url') as string || null,
    is_active: true,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/barbeiros')
  revalidatePath('/dashboard')
}

export async function updateBarber(id: string, formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('barbers').update({
    name: formData.get('name') as string,
    bio: formData.get('bio') as string,
    avatar_url: formData.get('avatar_url') as string || null,
  }).eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/barbeiros')
}

export async function toggleBarberStatus(id: string, isActive: boolean) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('barbers')
    .update({ is_active: !isActive })
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/barbeiros')
}

export async function deleteBarber(id: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('barbers')
    .delete()
    .eq('id', id).eq('barbershop_id', barbershopId)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/barbeiros')
  revalidatePath('/dashboard')
}
