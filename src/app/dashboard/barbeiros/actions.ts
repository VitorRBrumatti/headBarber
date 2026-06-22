'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'

/**
 * Creates a new barber and automatically generates default work shifts for them
 * (Monday to Saturday, 09:00 - 19:00, lunch break 12:00 - 13:00) so they can be booked immediately.
 */
export async function createBarber(formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  
  // 1. Insert the barber
  const { data: newBarber, error } = await supabase
    .from('barbers')
    .insert({
      barbershop_id: barbershopId,
      name: formData.get('name') as string,
      bio: formData.get('bio') as string,
      avatar_url: formData.get('avatar_url') as string || null,
      commission_percentage: parseFloat(formData.get('commission_percentage') as string) || 0.00,
      is_active: true,
    })
    .select('id')
    .single()

  if (error || !newBarber) throw new Error(error?.message || 'Erro ao criar barbeiro')

  // 2. Generate default work hours for Monday (1) through Saturday (6). Sunday (0) is disabled by default.
  // Standard hours: 09:00 to 19:00. Lunch: 12:00 to 13:00.
  const defaultShifts = []
  for (let day = 1; day <= 6; day++) {
    defaultShifts.push({
      barbershop_id: barbershopId,
      barber_id: newBarber.id,
      day_of_week: day,
      start_time: '09:00:00',
      end_time: '19:00:00',
      lunch_start_time: '12:00:00',
      lunch_end_time: '13:00:00',
      is_active: true,
    })
  }
  // Insert Sunday as inactive shift
  defaultShifts.push({
    barbershop_id: barbershopId,
    barber_id: newBarber.id,
    day_of_week: 0,
    start_time: '09:00:00',
    end_time: '19:00:00',
    lunch_start_time: '12:00:00',
    lunch_end_time: '13:00:00',
    is_active: false,
  })

  const { error: hoursError } = await supabase
    .from('barber_work_hours')
    .insert(defaultShifts)

  if (hoursError) {
    console.error('Failed to create default work hours for new barber:', hoursError.message)
  }

  revalidatePath('/dashboard/barbeiros')
  revalidatePath('/dashboard')
}

export async function updateBarber(id: string, formData: FormData) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { error } = await supabase.from('barbers').update({
    name: formData.get('name') as string,
    bio: formData.get('bio') as string,
    avatar_url: formData.get('avatar_url') as string || null,
    commission_percentage: parseFloat(formData.get('commission_percentage') as string) || 0.00,
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
  
  // 1. Delete work hours first to avoid shift blockages
  await supabase.from('barber_work_hours')
    .delete()
    .eq('barber_id', id)
    .eq('barbershop_id', barbershopId)

  // 2. Try to delete the barber
  const { error } = await supabase.from('barbers')
    .delete()
    .eq('id', id)
    .eq('barbershop_id', barbershopId)

  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Este profissional possui agendamentos cadastrados. Para preservar o histórico financeiro e de reservas, ele não pode ser excluído permanentemente. Recomendamos desativá-lo utilizando o botão de energia.'
      )
    }
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/barbeiros')
  revalidatePath('/dashboard')
}

/**
 * Fetches individual work hours for a specific barber.
 */
export async function getBarberWorkHours(barberId: string) {
  const { supabase, barbershopId } = await getBarbershopId()

  let { data, error } = await supabase
    .from('barber_work_hours')
    .select('*')
    .eq('barber_id', barberId)
    .eq('barbershop_id', barbershopId)
    .order('day_of_week')

  if (error) throw new Error(error.message)

  // Self-healing: if a barber exists but has no shifts, generate standard shifts immediately
  if (!data || data.length === 0) {
    const defaultShifts = []
    
    // Mon-Sat 09:00 - 19:00, lunch 12:00 - 13:00
    for (let day = 1; day <= 6; day++) {
      defaultShifts.push({
        barbershop_id: barbershopId,
        barber_id: barberId,
        day_of_week: day,
        start_time: '09:00:00',
        end_time: '19:00:00',
        lunch_start_time: '12:00:00',
        lunch_end_time: '13:00:00',
        is_active: true,
      })
    }
    
    // Sunday off
    defaultShifts.push({
      barbershop_id: barbershopId,
      barber_id: barberId,
      day_of_week: 0,
      start_time: '09:00:00',
      end_time: '19:00:00',
      lunch_start_time: '12:00:00',
      lunch_end_time: '13:00:00',
      is_active: false,
    })

    const { data: newShifts, error: insertError } = await supabase
      .from('barber_work_hours')
      .insert(defaultShifts)
      .select()
      .order('day_of_week')

    if (insertError) {
      console.error('Failed to auto-heal work hours for barber:', insertError.message)
      // fallback in-memory mock to let UI load
      return defaultShifts as any[]
    }
    return newShifts || []
  }

  return data || []
}

/**
 * Updates or inserts shifts for a barber.
 */
export async function updateBarberWorkHours(barberId: string, shifts: any[]) {
  const { supabase, barbershopId } = await getBarbershopId()

  for (const shift of shifts) {
    const { error } = await supabase
      .from('barber_work_hours')
      .update({
        start_time: shift.start_time,
        end_time: shift.end_time,
        lunch_start_time: shift.lunch_start_time,
        lunch_end_time: shift.lunch_end_time,
        is_active: shift.is_active,
      })
      .eq('id', shift.id)
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)

    if (error) throw new Error(`Erro ao atualizar turno do dia ${shift.day_of_week}: ${error.message}`)
  }

  revalidatePath('/dashboard/barbeiros')
}
