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

export type SubscriptionCoverageStatus =
  'none' | 'awaiting_cycle' | 'waiting' | 'partial' | 'covered'

export interface BookingCoveragePreview {
  attendanceTotal: string
  subscriptionCoveredTotal: string
  amountDue: string
  subscriptionCoverageStatus: SubscriptionCoverageStatus
  subscriptionPlanName: string | null
  productSubtotal: string
  totalAtShop: string
}

export interface CreatedBookingReceipt {
  appointmentId: string
  barberId: string
  barberName: string
  serviceId: string
  serviceName: string
  servicePrice: string
  serviceDurationMinutes: number
  addOnDurationMinutes: number
  addOnTotal: string
  productSubtotal: string
  attendanceTotal: string
  subscriptionCoveredTotal: string
  amountDue: string
  subscriptionCoverageStatus: SubscriptionCoverageStatus
  subscriptionPlanName: string | null
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
