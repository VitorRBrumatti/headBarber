'use server'

import { getBarbershopId } from '@/utils/get-barbershop'
import {
  mapAgendaBlocks,
  mapAgendaSettings,
  mapAgendaWorkHours,
} from './agenda-schedule-mappers'

export async function getAgendaSchedule(dateStr: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`
  const dayOfWeek = new Date(startOfDay).getUTCDay()

  const [settingsResult, workHoursResult, blocksResult] = await Promise.all([
    supabase
      .from('barbershop_settings')
      .select('slot_interval_minutes, default_start_time, default_end_time')
      .eq('barbershop_id', barbershopId)
      .maybeSingle(),
    supabase
      .from('barber_work_hours')
      .select(
        'barber_id, start_time, end_time, lunch_start_time, lunch_end_time',
      )
      .eq('barbershop_id', barbershopId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true),
    supabase
      .from('barber_blocked_times')
      .select('id, barber_id, start_at, end_at, reason')
      .eq('barbershop_id', barbershopId)
      .lt('start_at', endOfDay)
      .gt('end_at', startOfDay),
  ])

  if (settingsResult.error) {
    throw new Error(settingsResult.error.message)
  }
  if (workHoursResult.error) {
    throw new Error(workHoursResult.error.message)
  }
  if (blocksResult.error) {
    throw new Error(blocksResult.error.message)
  }

  return {
    settings: mapAgendaSettings(settingsResult.data),
    workHours: mapAgendaWorkHours(workHoursResult.data ?? []),
    blocks: mapAgendaBlocks(blocksResult.data ?? []),
  }
}
