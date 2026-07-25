export interface BarberServiceOption {
  id: string
  barberId: string
  serviceId: string
  name: string
  description: string | null
  price: number
  durationMinutes: number
  configurationVersion: number
}

export interface CreatedBookingReceipt {
  appointmentId: string
  barberId: string
  barberName: string
  serviceId: string
  serviceName: string
  servicePrice: string
  serviceDurationMinutes: number
  addOnTotal: string
  productSubtotal: string
  attendanceTotal: string
  totalAtShop: string
  startAt: string
  endAt: string
}

export interface BookingProduct {
  id: string
  name: string
  description: string | null
  category: string | null
  sale_price: number
  stock_quantity: number
  image_url: string | null
}

export type SelectedProductQuantities = Record<string, number>
export type ProductSelection = SelectedProductQuantities

export interface SelectedBookingProduct {
  productId: string
  quantity: number
}

export interface UnavailableProduct {
  productId: string
  availableQuantity: number
}
