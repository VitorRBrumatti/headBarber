import { describe, expect, it } from 'vitest'
import {
  selectBarber,
  selectBarberService,
  type BookingSelectionState,
} from '@/app/booking/[slug]/booking-selection'

const state: BookingSelectionState = {
  barberId: 'barber-a',
  barberServiceId: 'relation-a',
  serviceId: 'service-a',
  date: '2026-07-25',
  time: '10:30',
  slots: ['10:30', '11:00'],
  error: 'erro antigo',
  addOnIds: ['addon-a'],
  productQuantities: { 'product-a': 2 },
}

describe('booking selection resets', () => {
  it('clears barber-dependent choices and preserves products', () => {
    expect(selectBarber(state, 'barber-b')).toEqual({
      barberId: 'barber-b',
      barberServiceId: '',
      serviceId: '',
      date: '',
      time: '',
      slots: [],
      error: '',
      addOnIds: [],
      productQuantities: { 'product-a': 2 },
    })
  })

  it('clears schedule choices when the service changes', () => {
    expect(
      selectBarberService(state, {
        barberServiceId: 'relation-b',
        serviceId: 'service-b',
      }),
    ).toEqual({
      barberId: 'barber-a',
      barberServiceId: 'relation-b',
      serviceId: 'service-b',
      date: '',
      time: '',
      slots: [],
      error: '',
      addOnIds: ['addon-a'],
      productQuantities: { 'product-a': 2 },
    })
  })

  it('does not mutate the previous selection', () => {
    selectBarber(state, 'barber-b')
    expect(state.barberServiceId).toBe('relation-a')
    expect(state.slots).toEqual(['10:30', '11:00'])
  })
})
