import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  canTransitionAppointmentStatus,
  getAllowedAppointmentTransitions,
} from '@/app/dashboard/agenda/agenda-rules'

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8')

describe('manual appointment administration', () => {
  it('loads barber relationships instead of global service prices', () => {
    const page = source('src/app/dashboard/agenda/page.tsx')
    const actions = source('src/app/dashboard/agenda/actions.ts')
    expect(page).not.toContain(".from('services')")
    expect(actions).toContain('getAdminBarberServicesAction')
    expect(actions).toContain(".from('barber_services')")
    expect(actions).toContain("'get_public_available_slots_for_service'")
  })

  it('creates manual appointments from relation/version and a receipt', () => {
    const actions = source('src/app/dashboard/agenda/actions.ts')
    expect(actions).toContain(
      "'create_public_appointment_with_barber_service_and_products'",
    )
    expect(actions).toContain('p_barber_service_id: input.barberServiceId')
    expect(actions).toContain(
      'p_configuration_version: input.configurationVersion',
    )
    expect(actions).not.toContain("'create_public_appointment_with_client'")
    expect(actions).toContain("'create_admin_booking_with_entitlements'")
    expect(actions).toContain('client_subscriptions_booking_enabled')
  })

  it('renders a barber-first, service-aware manual form', () => {
    const sheet = source('src/app/dashboard/agenda/manual-booking-sheet.tsx')
    expect(sheet.indexOf('Profissional')).toBeLessThan(sheet.indexOf('Serviço'))
    expect(sheet).toContain('setSelectedServiceId')
    expect(sheet).toContain('getAdminSlotsAction')
    expect(sheet).not.toContain('Duração: 30 minutos')
  })
})

describe('appointment status transition safety', () => {
  it('allows only reviewed transitions', () => {
    expect(getAllowedAppointmentTransitions('confirmed')).toEqual([
      'completed',
      'cancelled',
      'no_show',
    ])
    expect(getAllowedAppointmentTransitions('pending')).toEqual([
      'confirmed',
      'cancelled',
    ])
    expect(canTransitionAppointmentStatus('cancelled', 'confirmed')).toBe(false)
    expect(canTransitionAppointmentStatus('no_show', 'confirmed')).toBe(false)
  })
})

describe('historical appointment details', () => {
  it('queries service/add-on/product snapshots in Agenda and Reservas', () => {
    for (const path of [
      'src/app/dashboard/agenda/actions.ts',
      'src/app/dashboard/reservas/page.tsx',
    ]) {
      const file = source(path)
      expect(file).toContain('service_price')
      expect(file).toContain('service_duration_minutes')
      expect(file).toContain('appointment_add_ons')
      expect(file).toContain('duration_minutes')
      expect(file).toContain('appointment_products')
    }
  })

  it('renders attendance and product totals separately', () => {
    for (const path of [
      'src/app/dashboard/agenda/agenda-client.tsx',
      'src/app/dashboard/reservas/reservas-client.tsx',
    ]) {
      const file = source(path)
      expect(file).toContain('Preço do serviço')
      expect(file).toContain('Adicionais')
      expect(file).toContain('item.durationMinutes')
      expect(file).toContain('totalDurationMinutes')
      expect(file).toContain('Total do atendimento')
      expect(file).toContain('Coberto pela assinatura')
      expect(file).toContain('A pagar pelo atendimento')
      expect(file).toContain('Subtotal dos produtos')
      expect(file).toContain('Total na barbearia')
    }
  })
})
