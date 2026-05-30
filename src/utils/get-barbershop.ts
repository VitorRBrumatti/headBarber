'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Shared helper to get the authenticated user's barbershop context.
 * Used by all server actions that need tenant-scoped operations.
 * 
 * Returns the Supabase client and the barbershop_id for the current user.
 * Throws if the user is not authenticated or has no barbershop associated.
 */
export async function getBarbershopId() {
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
