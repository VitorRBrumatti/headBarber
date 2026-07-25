import type { SelectedProductQuantities } from './booking-types'

export interface BookingSelectionState {
  barberId: string
  barberServiceId: string
  serviceId: string
  date: string
  time: string
  slots: string[]
  error: string
  addOnIds: string[]
  productQuantities: SelectedProductQuantities
}

export function selectBarber(
  state: BookingSelectionState,
  barberId: string,
): BookingSelectionState {
  return {
    ...state,
    barberId,
    barberServiceId: '',
    serviceId: '',
    date: '',
    time: '',
    slots: [],
    error: '',
  }
}

export function selectBarberService(
  state: BookingSelectionState,
  selection: { barberServiceId: string; serviceId: string },
): BookingSelectionState {
  return {
    ...state,
    ...selection,
    date: '',
    time: '',
    slots: [],
    error: '',
  }
}
