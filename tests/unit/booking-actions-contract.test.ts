import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  mapBarberServiceRows,
  mapBookingRpcError,
  parseCreatedBookingReceipt,
} from '@/app/booking/[slug]/booking-action-mappers'

const source = readFileSync(
  resolve(process.cwd(), 'src/app/booking/[slug]/actions.ts'),
  'utf8',
)

describe('booking action behavior', () => {
  it('maps nested relationship rows to the stable public DTO', () => {
    expect(
      mapBarberServiceRows([
        {
          id: 'relation-a',
          barber_id: 'barber-a',
          service_id: 'service-a',
          price: '40.00',
          duration_minutes: 30,
          configuration_version: 7,
          services: {
            name: 'Corte',
            description: 'Corte cl?ssico',
          },
        },
      ]),
    ).toEqual([
      {
        id: 'relation-a',
        barberId: 'barber-a',
        serviceId: 'service-a',
        name: 'Corte',
        description: 'Corte cl?ssico',
        price: 40,
        durationMinutes: 30,
        configurationVersion: 7,
      },
    ])
  })

  it('keeps authoritative receipt money as decimal strings', () => {
    const receipt = {
      appointmentId: 'appointment-a',
      barberId: 'barber-a',
      barberName: 'Ana',
      serviceId: 'service-a',
      serviceName: 'Corte',
      servicePrice: '40.00',
      serviceDurationMinutes: 30,
      addOnTotal: '10.00',
      productSubtotal: '25.00',
      attendanceTotal: '50.00',
      totalAtShop: '75.00',
      startAt: '2026-07-25T13:00:00+00:00',
      endAt: '2026-07-25T13:30:00+00:00',
    }

    expect(parseCreatedBookingReceipt(receipt)).toEqual(receipt)
    expect(parseCreatedBookingReceipt(receipt).totalAtShop).toBe('75.00')
  })

  it.each([
    ['CONFIG_CHANGED', 'CONFIG_CHANGED'],
    ['INVALID_BARBER_SERVICE', 'INVALID_BARBER_SERVICE'],
    ['SLOT_UNAVAILABLE', 'SLOT_UNAVAILABLE'],
  ] as const)('maps %s to a stable structured error', (message, code) => {
    expect(mapBookingRpcError({ message })).toMatchObject({ code })
  })

  it('maps stock details to structured client data', () => {
    expect(
      mapBookingRpcError({
        message: 'INSUFFICIENT_STOCK',
        details: '[{"productId":"pomade","availableQuantity":1}]',
      }),
    ).toEqual({
      error:
        'Alguns produtos tiveram o estoque alterado. Ajuste as quantidades para continuar.',
      code: 'INSUFFICIENT_STOCK',
      unavailableProducts: [
        { productId: 'pomade', availableQuantity: 1 },
      ],
    })
  })
})

describe('booking action wiring', () => {
  it('loads services through explicitly scoped barber relationships', () => {
    expect(source).toContain(".from('barber_services')")
    expect(source).toContain(".eq('barbershop_id', barbershopId)")
    expect(source).toContain(".eq('barber_id', barberId)")
    expect(source).toContain(".eq('is_available', true)")
    expect(source).toContain(".eq('services.is_active', true)")
  })

  it('uses the service-aware slot and receipt RPCs', () => {
    expect(source).toContain("'get_public_available_slots_for_service'")
    expect(source).toContain(
      "'create_public_appointment_with_barber_service_and_products'",
    )
    expect(source).toContain('p_barber_service_id: input.barberServiceId')
    expect(source).toContain(
      'p_configuration_version: input.configurationVersion',
    )
  })

  it('loads products but no longer loads global services on the booking page', () => {
    expect(source).toContain(".from('products')")
    expect(source).not.toContain('// 2. Get active services')
  })
})
