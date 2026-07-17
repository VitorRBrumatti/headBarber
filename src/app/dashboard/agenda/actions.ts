'use server'

import { revalidatePath } from 'next/cache'
import { getBarbershopId } from '@/utils/get-barbershop'
import { sendWhatsAppNotification } from '@/lib/whatsapp'

/**
 * Fetches all necessary agenda data for a specific date in the dashboard.
 * Auto-creates default barbershop settings if they don't exist yet.
 */
export async function getAgendaAppointments(dateStr: string) {
  const { supabase, barbershopId } = await getBarbershopId()

  // 1. Fetch active barbers
  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, bio, avatar_url')
    .eq('barbershop_id', barbershopId)
    .eq('is_active', true)
    .order('name')

  // 2. Fetch or auto-create barbershop settings
  let { data: settings } = await supabase
    .from('barbershop_settings')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .single()

  if (!settings) {
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

    if (!insertError && newSettings) {
      settings = newSettings
    }
  }

  // 3. Fetch appointments for target date (start_at fits in the target date)
  // Construct UTC boundaries
  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      barber_id,
      client_id,
      service_id,
      start_at,
      end_at,
      status,
      total_price,
      notes,
      clients ( name, phone, email ),
      services ( name ),
      appointment_products (
        quantity,
        unit_price,
        status,
        products ( name, image_url )
      )
    `)
    .eq('barbershop_id', barbershopId)
    .gte('start_at', startOfDay)
    .lte('start_at', endOfDay)
    .order('start_at')

  // 4. Fetch work shifts for active barbers on this weekday
  // Javascript getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  const dateObj = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = dateObj.getDay()

  const { data: workHours } = await supabase
    .from('barber_work_hours')
    .select('id, barber_id, day_of_week, start_time, end_time, lunch_start_time, lunch_end_time, is_active')
    .eq('barbershop_id', barbershopId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  return {
    barbers: barbers || [],
    settings: settings || { slot_interval_minutes: 30 },
    appointments: (appointments || []) as any[],
    workHours: workHours || [],
  }
}

/**
 * Updates the status of an appointment in the dashboard (confirmed, completed, cancelled, no_show).
 */
export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const { supabase, barbershopId } = await getBarbershopId()

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .eq('barbershop_id', barbershopId)

  if (error) {
    throw new Error(`Erro ao atualizar status: ${error.message}`)
  }

  // Trigger hypothetical notification update or mock logs if cancelled
  if (status === 'cancelled') {
    try {
      const { data: appt } = await supabase
        .from('appointments')
        .select(`
          start_at,
          clients ( name, phone ),
          barbershops ( name )
        `)
        .eq('id', appointmentId)
        .single()

      if (appt) {
        const clientPhone = (appt.clients as any)?.phone
        const clientName = (appt.clients as any)?.name
        const barbershopName = (appt.barbershops as any)?.name

        if (clientPhone) {
          const cancelMessage = `Olá, *${clientName}*! Seu agendamento na *${barbershopName || 'Barbearia'}* para o dia ${new Date(appt.start_at).toLocaleDateString('pt-BR')} foi *cancelado* pelo estabelecimento. Caso tenha dúvidas, entre em contato.`
          await sendWhatsAppNotification(clientPhone, cancelMessage)
        }
      }
    } catch (err) {
      console.error('Failed to dispatch cancellation log:', err)
    }
  }

  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard/reservas')
}

export type CreateAdminBookingInput = {
  clientName: string
  clientPhone: string
  clientEmail?: string
  barberId: string
  serviceId: string
  startAt: string
  notes?: string
  addOnIds?: string[]
}

/**
 * Creates an appointment manually inside the admin dashboard.
 * Leverages the atomic transactional Postgres RPC to reuse validation and lock logic.
 */
export async function createAdminAppointment(input: CreateAdminBookingInput) {
  const { supabase, barbershopId } = await getBarbershopId()

  // Invoke RPC (since it's a security definer, it works atomic)
  const { data: appointmentId, error } = await supabase.rpc(
    'create_public_appointment_with_client',
    {
      p_barbershop_id: barbershopId,
      p_client_name: input.clientName,
      p_client_phone: input.clientPhone,
      p_client_email: input.clientEmail || null,
      p_barber_id: input.barberId,
      p_service_id: input.serviceId,
      p_start_at: input.startAt,
      p_notes: input.notes || null,
      p_add_on_ids: input.addOnIds || null,
    }
  )

  if (error) {
    return { error: error.message }
  }

  // Trigger WhatsApp Mock log in admin booking
  try {
    const { data: service } = await supabase
      .from('services')
      .select('name')
      .eq('id', input.serviceId)
      .single()

    const { data: barber } = await supabase
      .from('barbers')
      .select('name')
      .eq('id', input.barberId)
      .single()

    const formattedTime = input.startAt.substring(11, 16)
    const localDate = new Date(input.startAt)
    const formattedDate = localDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })

    const { data: appt } = await supabase
      .from('appointments')
      .select('total_price')
      .eq('id', appointmentId)
      .single()

    const totalPrice = appt?.total_price || 0

    const whatsappMessage = 
`Olá, *${input.clientName}*! Seu agendamento foi realizado pelo administrador do estabelecimento! ✅

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}
💈 *Profissional:* ${barber?.name || 'Barbeiro'}
✂ *Serviço:* ${service?.name || 'Serviço'}
💰 *Valor Total:* R$ ${totalPrice}

Agradecemos a preferência! 💈✂`

    await sendWhatsAppNotification(input.clientPhone, whatsappMessage)

    await supabase
      .from('appointments')
      .update({ whatsapp_confirmation_sent: true })
      .eq('id', appointmentId)

  } catch (err) {
    console.error('Failed to dispatch manual WhatsApp mock confirmation:', err)
  }

  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard/reservas')

  return { success: true, appointmentId }
}
