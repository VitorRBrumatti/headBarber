'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'

/**
 * Fetches the current barbershop settings, auto-initializing with standard defaults if missing.
 */
export async function getBarbershopSettings() {
  const { supabase, barbershopId } = await getBarbershopId()

  const { data, error } = await supabase
    .from('barbershop_settings')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .single()

  if (error || !data) {
    // Auto-create defaults
    const { data: newSettings, error: insertError } = await supabase
      .from('barbershop_settings')
      .insert({
        barbershop_id: barbershopId,
        whatsapp_reminder_hours: 2,
        slot_interval_minutes: 30,
        default_start_time: '09:00:00',
        default_end_time: '19:00:00',
        default_lunch_start: '12:00:00',
        default_lunch_end: '13:00:00',
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Erro ao inicializar configurações: ${insertError.message}`)
    }
    return newSettings
  }

  return data
}

export type UpdateSettingsInput = {
  whatsappReminderHours: number
  slotIntervalMinutes: number
  defaultStartTime: string
  defaultEndTime: string
  defaultLunchStart: string
  defaultLunchEnd: string
}

/**
 * Updates the barbershop settings.
 */
export async function updateBarbershopSettingsAction(input: UpdateSettingsInput) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { error } = await supabase
    .from('barbershop_settings')
    .update({
      whatsapp_reminder_hours: input.whatsappReminderHours,
      slot_interval_minutes: input.slotIntervalMinutes,
      default_start_time: input.defaultStartTime,
      default_end_time: input.defaultEndTime,
      default_lunch_start: input.defaultLunchStart,
      default_lunch_end: input.defaultLunchEnd,
    })
    .eq('barbershop_id', barbershopId)

  if (error) {
    throw new Error(`Erro ao salvar configurações: ${error.message}`)
  }

  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard')
}

/**
 * Creates a calendar block for a barber (vacation, personal time off, etc.).
 */
export async function createBarberBlock(
  barberId: string,
  startAt: string,
  endAt: string,
  reason: string
) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { error } = await supabase
    .from('barber_blocked_times')
    .insert({
      barbershop_id: barbershopId,
      barber_id: barberId,
      start_at: startAt,
      end_at: endAt,
      reason: reason || null,
    })

  if (error) {
    throw new Error(`Erro ao criar bloqueio: ${error.message}`)
  }

  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard/agenda')
}

/**
 * Fetches all active time blocks for a barber.
 */
export async function getBarberBlocks(barberId: string) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { data, error } = await supabase
    .from('barber_blocked_times')
    .select('*')
    .eq('barber_id', barberId)
    .eq('barbershop_id', barbershopId)
    .order('start_at')

  if (error) {
    throw new Error(`Erro ao buscar bloqueios: ${error.message}`)
  }

  return data || []
}

/**
 * Deletes a calendar block.
 */
export async function deleteBarberBlock(blockId: string) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { error } = await supabase
    .from('barber_blocked_times')
    .delete()
    .eq('id', blockId)
    .eq('barbershop_id', barbershopId)

  if (error) {
    throw new Error(`Erro ao excluir bloqueio: ${error.message}`)
  }

  revalidatePath('/dashboard/configuracoes')
  revalidatePath('/dashboard/agenda')
}
