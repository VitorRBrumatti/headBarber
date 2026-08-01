'use server'

import { revalidatePath } from 'next/cache'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { getBarbershopId } from '@/utils/get-barbershop'
import {
  mapBarberServiceRows,
  mapBookingRpcError,
  parseCreatedBookingReceipt,
} from '@/app/booking/[slug]/booking-action-mappers'
import {
  canTransitionAppointmentStatus,
  type AppointmentStatus,
} from './agenda-rules'
import { mapAppointmentRows } from './appointment-mappers'

export async function getAgendaAppointments(dateStr: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const startOfDay = `${dateStr}T00:00:00.000Z`
  const endOfDay = `${dateStr}T23:59:59.999Z`

  const [barbersResult, appointmentsResult] = await Promise.all([
    supabase
      .from('barbers')
      .select('id, name, bio, avatar_url')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('appointments')
      .select(
        `
        id,
        barber_id,
        start_at,
        end_at,
        status,
        service_price,
        service_duration_minutes,
        total_price,
        subscription_covered_total,
        amount_due,
        subscription_coverage_status,
        notes,
        clients ( name, phone, email ),
        services ( name ),
        barbers ( name ),
        appointment_add_ons (
          price,
          duration_minutes,
          add_ons ( name )
        ),
        appointment_products (
          quantity,
          unit_price,
          status,
          products ( name, image_url )
        ),
        appointment_subscription_allocations (
          status,
          subscription_cycle_entitlements (
            item_name_snapshot,
            subscription_cycles ( plan_name_snapshot )
          )
        )
      `,
      )
      .eq('barbershop_id', barbershopId)
      .gte('start_at', startOfDay)
      .lte('start_at', endOfDay)
      .order('start_at'),
  ])

  if (barbersResult.error) throw new Error(barbersResult.error.message)
  if (appointmentsResult.error) {
    throw new Error(appointmentsResult.error.message)
  }

  return {
    barbers: (barbersResult.data ?? []).map((barber) => ({
      id: barber.id,
      name: barber.name,
      bio: barber.bio,
      avatarUrl: barber.avatar_url,
    })),
    appointments: mapAppointmentRows(appointmentsResult.data ?? []),
  }
}

export async function getAdminBarberServicesAction(barberId: string) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data, error } = await supabase
    .from('barber_services')
    .select(
      'id, barber_id, service_id, price, duration_minutes, configuration_version, services!inner(name, description)',
    )
    .eq('barbershop_id', barbershopId)
    .eq('barber_id', barberId)
    .eq('is_available', true)
    .eq('services.is_active', true)

  if (error) {
    return {
      success: false as const,
      error: 'Não foi possível carregar os serviços do profissional.',
    }
  }
  return {
    success: true as const,
    services: mapBarberServiceRows(data ?? []),
  }
}

export async function getAdminSlotsAction(
  barberServiceId: string,
  dateStr: string,
) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data, error } = await supabase.rpc(
    'get_public_available_slots_for_service',
    {
      p_barbershop_id: barbershopId,
      p_barber_service_id: barberServiceId,
      p_date: dateStr,
    },
  )
  if (error) {
    return {
      success: false as const,
      error: 'Não foi possível carregar os horários disponíveis.',
    }
  }
  return {
    success: true as const,
    slots: ((data ?? []) as { available_time: string }[]).map((slot) =>
      slot.available_time.substring(0, 5),
    ),
  }
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data: appointment, error: loadError } = await supabase
    .from('appointments')
    .select('status')
    .eq('id', appointmentId)
    .eq('barbershop_id', barbershopId)
    .single()

  if (loadError || !appointment) {
    throw new Error('Agendamento não encontrado.')
  }

  const currentStatus = appointment.status as AppointmentStatus
  if (!canTransitionAppointmentStatus(currentStatus, status)) {
    throw new Error('Transição de status não permitida.')
  }

  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .eq('barbershop_id', barbershopId)

  if (error) throw new Error(`Erro ao atualizar status: ${error.message}`)

  if (status === 'cancelled') {
    try {
      const { data: cancelled } = await supabase
        .from('appointments')
        .select('start_at, clients(name, phone), barbershops(name)')
        .eq('id', appointmentId)
        .single()
      const client = Array.isArray(cancelled?.clients)
        ? cancelled.clients[0]
        : cancelled?.clients
      const barbershop = Array.isArray(cancelled?.barbershops)
        ? cancelled.barbershops[0]
        : cancelled?.barbershops
      if (client?.phone && cancelled?.start_at) {
        await sendWhatsAppNotification(
          client.phone,
          `Olá, *${client.name}*! Seu agendamento na *${barbershop?.name || 'Barbearia'}* para ${new Date(cancelled.start_at).toLocaleDateString('pt-BR')} foi cancelado pelo estabelecimento.`,
        )
      }
    } catch (notificationError) {
      console.error('Failed to dispatch cancellation log:', notificationError)
    }
  }

  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard/reservas')
}

export type CreateAdminBookingInput = {
  clientName: string
  clientPhone: string
  clientEmail?: string
  barberServiceId: string
  configurationVersion: number
  startAt: string
  notes?: string
  addOnIds?: string[]
}

export async function createAdminAppointment(input: CreateAdminBookingInput) {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data: settings } = await supabase
    .from('barbershop_settings')
    .select('client_subscriptions_booking_enabled')
    .eq('barbershop_id', barbershopId)
    .maybeSingle()
  const bookingCoverageEnabled =
    settings?.client_subscriptions_booking_enabled === true
  const bookingRpc = bookingCoverageEnabled
    ? 'create_admin_booking_with_entitlements'
    : 'create_public_appointment_with_barber_service_and_products'
  const parameters = bookingCoverageEnabled
    ? {
        p_client_name: input.clientName,
        p_client_phone: input.clientPhone,
        p_client_email: input.clientEmail || null,
        p_barber_service_id: input.barberServiceId,
        p_configuration_version: input.configurationVersion,
        p_start_at: input.startAt,
        p_notes: input.notes || null,
        p_add_ons: [],
        p_products: [],
      }
    : {
        p_barbershop_id: barbershopId,
        p_client_name: input.clientName,
        p_client_phone: input.clientPhone,
        p_client_email: input.clientEmail || null,
        p_barber_service_id: input.barberServiceId,
        p_configuration_version: input.configurationVersion,
        p_start_at: input.startAt,
        p_notes: input.notes || null,
        p_add_on_ids: input.addOnIds || null,
        p_products: [],
      }
  const { data, error } = await supabase.rpc(bookingRpc, parameters)

  if (error) return mapBookingRpcError(error)
  const receipt = parseCreatedBookingReceipt(data)

  try {
    const formattedDate = new Date(receipt.startAt).toLocaleDateString(
      'pt-BR',
      { dateStyle: 'long', timeZone: 'UTC' },
    )
    await sendWhatsAppNotification(
      input.clientPhone,
      `Olá, *${input.clientName}*! Seu agendamento foi criado pelo estabelecimento. ✅

Data: ${formattedDate}
Horário: ${receipt.startAt.substring(11, 16)}
Profissional: ${receipt.barberName}
Serviço: ${receipt.serviceName} (${receipt.serviceDurationMinutes} min)
Total do atendimento: R$ ${receipt.attendanceTotal.replace('.', ',')}`,
    )
    await supabase
      .from('appointments')
      .update({ whatsapp_confirmation_sent: true })
      .eq('id', receipt.appointmentId)
  } catch (notificationError) {
    console.error(
      'Failed to dispatch manual WhatsApp confirmation:',
      notificationError,
    )
  }

  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard/reservas')
  return { success: true as const, receipt }
}
