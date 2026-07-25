'use server'

import { sendWhatsAppNotification } from '@/lib/whatsapp'
import { createClient } from '@/utils/supabase/server'
import { filterBookableSlotsForDate } from './booking-availability'
import {
  mapBarberServiceRows,
  mapBookingRpcError,
  parseCreatedBookingReceipt,
} from './booking-action-mappers'
import type { SelectedBookingProduct } from './booking-types'

export async function getBookingPageData(slug: string) {
  const supabase = await createClient()
  const { data: barbershop, error: barbershopError } = await supabase
    .from('barbershops')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (barbershopError || !barbershop) {
    throw new Error('Barbearia não encontrada')
  }

  const [barbersResult, addOnsResult, productsResult] = await Promise.all([
    supabase
      .from('barbers')
      .select('id, name, bio, avatar_url')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('add_ons')
      .select('id, name, price')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('products')
      .select(
        'id, name, description, category, sale_price, stock_quantity, image_url',
      )
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .order('name'),
  ])

  if (productsResult.error) {
    console.error(
      'Error loading public products:',
      productsResult.error.message,
    )
  }

  return {
    barbershop,
    barbers: barbersResult.data || [],
    addOns: addOnsResult.data || [],
    products: productsResult.data || [],
  }
}

export async function getBarberServicesAction(
  barbershopId: string,
  barberId: string,
) {
  const supabase = await createClient()
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
    console.error('Error loading barber services:', error.message)
    return {
      success: false as const,
      error: 'Não foi possível carregar os serviços deste profissional.',
    }
  }

  return {
    success: true as const,
    services: mapBarberServiceRows(data || []),
  }
}

export async function getPublicSlotsAction(
  barbershopId: string,
  barberServiceId: string,
  dateStr: string,
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    'get_public_available_slots_for_service',
    {
      p_barbershop_id: barbershopId,
      p_barber_service_id: barberServiceId,
      p_date: dateStr,
    },
  )

  if (error) {
    console.error('Error fetching public slots:', error.message)
    return {
      success: false as const,
      error: 'Não foi possível carregar os horários disponíveis.',
    }
  }

  const slots = ((data || []) as { available_time: string }[])
    .map((slot) => slot.available_time.substring(0, 5))
    .sort()

  return {
    success: true as const,
    slots: filterBookableSlotsForDate(slots, dateStr),
  }
}

export type CreatePublicBookingInput = {
  barbershopId: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  barberServiceId: string
  configurationVersion: number
  startAt: string
  notes?: string
  addOnIds?: string[]
  products?: SelectedBookingProduct[]
}

export async function createPublicBooking(input: CreatePublicBookingInput) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    'create_public_appointment_with_barber_service_and_products',
    {
      p_barbershop_id: input.barbershopId,
      p_client_name: input.clientName,
      p_client_phone: input.clientPhone,
      p_client_email: input.clientEmail || null,
      p_barber_service_id: input.barberServiceId,
      p_configuration_version: input.configurationVersion,
      p_start_at: input.startAt,
      p_notes: input.notes || null,
      p_add_on_ids: input.addOnIds || null,
      p_products: input.products || [],
    },
  )

  if (error) {
    console.error('Error invoking authoritative booking RPC:', error.message)
    return mapBookingRpcError(error)
  }

  let receipt
  try {
    receipt = parseCreatedBookingReceipt(data)
  } catch (receiptError) {
    console.error('Invalid authoritative booking receipt:', receiptError)
    return {
      error: 'O agendamento foi criado, mas o comprovante não pôde ser carregado.',
      code: 'INVALID_RECEIPT' as const,
    }
  }

  try {
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('name')
      .eq('id', input.barbershopId)
      .single()

    const formattedDate = new Date(receipt.startAt).toLocaleDateString(
      'pt-BR',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      },
    )
    const formattedTime = receipt.startAt.substring(11, 16)
    const whatsappMessage = `Olá, *${input.clientName}*! Seu agendamento na *${barbershop?.name || 'Barbearia'}* foi confirmado com sucesso! ✅

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}
💈 *Profissional:* ${receipt.barberName}
✂️ *Serviço:* ${receipt.serviceName} (${receipt.serviceDurationMinutes} min)
💰 *Atendimento:* R$ ${receipt.attendanceTotal.replace('.', ',')}
📦 *Produtos:* R$ ${receipt.productSubtotal.replace('.', ',')}
💳 *Total na barbearia:* R$ ${receipt.totalAtShop.replace('.', ',')}

Agradecemos a preferência e nos vemos em breve!`

    await sendWhatsAppNotification(input.clientPhone, whatsappMessage)
    await supabase
      .from('appointments')
      .update({ whatsapp_confirmation_sent: true })
      .eq('id', receipt.appointmentId)
  } catch (notificationError) {
    console.error(
      'Failed to format or send WhatsApp confirmation log:',
      notificationError,
    )
  }

  return { success: true as const, receipt }
}
