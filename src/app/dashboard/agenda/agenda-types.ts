import type { AppointmentStatus } from './agenda-rules'

export interface AgendaBarber {
  id: string
  name: string
  bio: string | null
  avatarUrl: string | null
}

export interface AppointmentAddOnSnapshot {
  name: string
  price: number
  durationMinutes: number
}

export interface AppointmentProductSnapshot {
  name: string
  imageUrl: string | null
  quantity: number
  unitPrice: number
  status: string
}

export interface AppointmentDetails {
  id: string
  barberId: string
  startAt: string
  endAt: string
  status: AppointmentStatus
  servicePrice: number
  serviceDurationMinutes: number
  totalDurationMinutes: number
  attendanceTotal: number
  subscriptionCoveredTotal: number
  amountDue: number
  subscriptionCoverageStatus:
    'none' | 'awaiting_cycle' | 'waiting' | 'partial' | 'covered'
  subscriptionPlanName: string | null
  waitingSubscriptionItems: string[]
  notes: string | null
  client: {
    name: string
    phone: string
    email: string | null
  }
  serviceName: string
  barberName: string
  addOns: AppointmentAddOnSnapshot[]
  products: AppointmentProductSnapshot[]
}
