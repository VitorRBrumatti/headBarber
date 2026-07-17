'use server'

import { createClient } from '@/utils/supabase/server'
import { sendWhatsAppNotification } from '@/lib/whatsapp'
import type {
  SelectedBookingProduct,
  UnavailableProduct,
} from './booking-types'

/**
 * Fetches the active data for the public booking page.
 * Validates that the barbershop exists by slug.
 */
export async function getBookingPageData(slug: string) {
  const supabase = await createClient()

  // 1. Get the barbershop
  const { data: barbershop, error: barbershopError } = await supabase
    .from('barbershops')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (barbershopError || !barbershop) {
    throw new Error('Barbearia não encontrada')
  }

  // 2. Get active services
  const { data: services } = await supabase
    .from('services')
    .select('id, name, description, price, duration_minutes')
    .eq('barbershop_id', barbershop.id)
    .eq('is_active', true)
    .order('name')

  // 3. Get active barbers
  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, bio, avatar_url')
    .eq('barbershop_id', barbershop.id)
    .eq('is_active', true)
    .order('name')

  // 4. Get active add-ons
  const { data: addOns } = await supabase
    .from('add_ons')
    .select('id, name, price')
    .eq('barbershop_id', barbershop.id)
    .eq('is_active', true)
    .order('name')

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, description, category, sale_price, stock_quantity, image_url')
    .eq('barbershop_id', barbershop.id)
    .eq('is_active', true)
    .order('name')

  if (productsError) {
    console.error('Error loading public products:', productsError.message)
  }

  return {
    barbershop,
    services: services || [],
    barbers: barbers || [],
    addOns: addOns || [],
    products: products || [],
  }
}

/**
 * Server Action to fetch available 30-minute slots for a barber on a specific date.
 * Exposes ONLY the slot times, keeping all other bookings 100% private.
 * Handles the "any" barber option by unioning the available slots of all active barbers.
 */
export async function getPublicSlotsAction(
  barbershopId: string,
  barberId: string | 'any',
  dateStr: string
) {
  const supabase = await createClient()

  // 1. Resolve barbers to check
  let barbersToCheck: string[] = []

  if (barberId === 'any') {
    const { data: activeBarbers } = await supabase
      .from('barbers')
      .select('id')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (!activeBarbers || activeBarbers.length === 0) {
      return []
    }
    barbersToCheck = activeBarbers.map((b) => b.id)
  } else {
    barbersToCheck = [barberId]
  }

  // 1.5 Auto-heal work hours if missing for any barber being queried
  for (const bId of barbersToCheck) {
    const { count, error: countError } = await supabase
      .from('barber_work_hours')
      .select('*', { count: 'exact', head: true })
      .eq('barber_id', bId)

    if (!countError && count === 0) {
      const defaultShifts = []
      // Mon-Sat active
      for (let day = 1; day <= 6; day++) {
        defaultShifts.push({
          barbershop_id: barbershopId,
          barber_id: bId,
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
        barber_id: bId,
        day_of_week: 0,
        start_time: '09:00:00',
        end_time: '19:00:00',
        lunch_start_time: '12:00:00',
        lunch_end_time: '13:00:00',
        is_active: false,
      })
      await supabase.from('barber_work_hours').insert(defaultShifts)
    }
  }

  // 2. Fetch slots for each barber from the database RPC
  const allSlotsPromises = barbersToCheck.map(async (bId) => {
    const { data, error } = await supabase.rpc('get_public_available_slots', {
      p_barbershop_id: barbershopId,
      p_barber_id: bId,
      p_date: dateStr,
    })

    if (error) {
      console.error(`Error fetching slots for barber ${bId}:`, error.message)
      return []
    }
    return (data || []) as { available_time: string }[]
  })

  const results = await Promise.all(allSlotsPromises)

  // 3. Union slots and keep only unique ones
  const slotsSet = new Set<string>()
  results.forEach((barberSlots) => {
    barberSlots.forEach((slot) => {
      // available_time comes as "HH:MM:SS" or "HH:MM", slice to "HH:MM"
      const timeStr = slot.available_time.substring(0, 5)
      slotsSet.add(timeStr)
    })
  })

  const sortedSlots = Array.from(slotsSet).sort()

  // 4. If target date is today, filter out past slots in local time
  const targetDate = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const isToday =
    targetDate.getFullYear() === today.getFullYear() &&
    targetDate.getMonth() === today.getMonth() &&
    targetDate.getDate() === today.getDate()

  if (isToday) {
    const currentHour = today.getHours()
    const currentMinute = today.getMinutes()

    return sortedSlots.filter((slot) => {
      const [hour, minute] = slot.split(':').map(Number)
      if (hour > currentHour) return true
      if (hour === currentHour && minute > currentMinute) return true
      return false
    })
  }

  return sortedSlots
}

export type CreatePublicBookingInput = {
  barbershopId: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  barberId: string | 'any'
  serviceId: string
  startAt: string // ISO string timestamp, e.g. "2026-06-01T14:30:00.000Z"
  notes?: string
  addOnIds?: string[]
  products?: SelectedBookingProduct[]
}

/**
 * Server Action to create a public booking for a guest client.
 * Calls the secure transactional RPC which handles concurrency locks,
 * and then triggers the WhatsApp notification simulation.
 */
export async function createPublicBooking(input: CreatePublicBookingInput) {
  const supabase = await createClient()

  let finalBarberId = input.barberId

  // 1. If barber is "any", find one who is actually available at this exact start time
  if (input.barberId === 'any') {
    const { data: activeBarbers } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('barbershop_id', input.barbershopId)
      .eq('is_active', true)

    if (!activeBarbers || activeBarbers.length === 0) {
      return { error: 'Nenhum barbeiro ativo cadastrado nesta barbearia.' }
    }

    // Check availability slot by slot
    const dateStr = input.startAt.substring(0, 10)
    const targetTime = input.startAt.substring(11, 16) // "HH:MM"

    let chosenBarberId: string | null = null

    for (const barber of activeBarbers) {
      const { data: slots } = await supabase.rpc('get_public_available_slots', {
        p_barbershop_id: input.barbershopId,
        p_barber_id: barber.id,
        p_date: dateStr,
      })

      const isAvailable = (slots || []).some(
        (s: any) => s.available_time.substring(0, 5) === targetTime
      )

      if (isAvailable) {
        chosenBarberId = barber.id
        break
      }
    }

    if (!chosenBarberId) {
      return { error: 'Nenhum barbeiro disponível para o horário selecionado.' }
    }

    finalBarberId = chosenBarberId
  }

  // 2. Invoke the Postgres transactional booking RPC
  const { data: appointmentId, error } = await supabase.rpc(
    'create_public_appointment_with_products',
    {
      p_barbershop_id: input.barbershopId,
      p_client_name: input.clientName,
      p_client_phone: input.clientPhone,
      p_client_email: input.clientEmail || null,
      p_barber_id: finalBarberId,
      p_service_id: input.serviceId,
      p_start_at: input.startAt,
      p_notes: input.notes || null,
      p_add_on_ids: input.addOnIds || null,
      p_products: input.products || [],
    }
  )

  if (error) {
    console.error('Error invoking booking RPC:', error.message)

    if (error.message === 'INSUFFICIENT_STOCK') {
      let unavailableProducts: UnavailableProduct[] = []

      try {
        unavailableProducts = JSON.parse(error.details || '[]')
      } catch {
        unavailableProducts = []
      }

      return {
        error: 'Alguns produtos tiveram o estoque alterado. Ajuste as quantidades para continuar.',
        code: 'INSUFFICIENT_STOCK' as const,
        unavailableProducts,
      }
    }

    return { error: error.message }
  }

  // 3. Trigger decoupled mock WhatsApp notification
  try {
    // Retrieve details for a nice message formatting
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('name')
      .eq('id', input.barbershopId)
      .single()

    const { data: service } = await supabase
      .from('services')
      .select('name')
      .eq('id', input.serviceId)
      .single()

    const { data: barber } = await supabase
      .from('barbers')
      .select('name')
      .eq('id', finalBarberId)
      .single()

    const localDate = new Date(input.startAt)
    const formattedDate = localDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
    const formattedTime = input.startAt.substring(11, 16)

    // Calculate total price in Javascript just for notification (RPC already saved correctly in database)
    const { data: appt } = await supabase
      .from('appointments')
      .select('total_price')
      .eq('id', appointmentId)
      .single()

    const totalPrice = appt?.total_price || 0

    let addOnsText = ''
    if (input.addOnIds && input.addOnIds.length > 0) {
      const { data: addOns } = await supabase
        .from('add_ons')
        .select('name')
        .in('id', input.addOnIds)
      
      if (addOns && addOns.length > 0) {
        addOnsText = `\n➕ *Adicionais:* ${addOns.map((a) => a.name).join(', ')}`
      }
    }

    let productsText = ''
    if (input.products && input.products.length > 0) {
      const quantities = new Map(input.products.map((item) => [item.productId, item.quantity]))
      const { data: reservedProducts } = await supabase
        .from('products')
        .select('id, name, sale_price')
        .in('id', input.products.map((item) => item.productId))

      if (reservedProducts && reservedProducts.length > 0) {
        const productLines = reservedProducts.map((product) => {
          const quantity = quantities.get(product.id) || 0
          const subtotal = Number(product.sale_price) * quantity
          return `  • ${quantity}x ${product.name} — R$ ${subtotal.toFixed(2).replace('.', ',')}`
        })
        productsText = `\n\n📦 *Produtos reservados para retirada:*\n${productLines.join('\n')}\n_Pagamento na barbearia._`
      }
    }

    const whatsappMessage = 
`Olá, *${input.clientName}*! Seu agendamento na *${barbershop?.name || 'Barbearia'}* foi confirmado com sucesso! ✅

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}
💈 *Profissional:* ${barber?.name || 'Qualquer'}
✂️ *Serviço:* ${service?.name || 'Corte'} ${addOnsText}
💰 *Valor do atendimento:* R$ ${totalPrice}${productsText}

Agradecemos a preferência e nos vemos em breve! 💈✂️`

    await sendWhatsAppNotification(input.clientPhone, whatsappMessage)
    
    // Update confirmation flag in db
    await supabase
      .from('appointments')
      .update({ whatsapp_confirmation_sent: true })
      .eq('id', appointmentId)

  } catch (notificationError) {
    console.error('Failed to format or send WhatsApp confirmation log:', notificationError)
  }

  return { success: true, appointmentId }
}
