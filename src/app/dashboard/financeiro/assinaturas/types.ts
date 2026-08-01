export type SubscriptionStatus = 'active' | 'paused' | 'cancelled'
export type SubscriptionItemType = 'service' | 'add_on'
export type SubscriptionPaymentMethod =
  | 'money'
  | 'pix'
  | 'credit_card'
  | 'debit_card'
  | 'other'

export type SubscriptionActionResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; error: string }

export interface SubscriptionPlanItem {
  id: string
  itemType: SubscriptionItemType
  serviceId: string | null
  addOnId: string | null
  targetName: string
  monthlyLimit: number | null
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  monthlyPrice: number
  isActive: boolean
  configurationVersion: number
  items: SubscriptionPlanItem[]
}

export interface ClientSubscriber {
  id: string
  clientId: string
  clientName: string
  planId: string
  planName: string
  status: SubscriptionStatus
  startedOn: string
  nextBillingDate: string
  pendingPlanId: string | null
  pendingPlanName: string | null
}

export interface SubscriptionCycle {
  id: string
  subscriptionId: string
  clientName: string
  planName: string
  periodStart: string
  periodEnd: string
  status: string
  amount: number
  paymentMethod: SubscriptionPaymentMethod | null
  paidAt: string | null
}

export interface SubscriptionCatalogOption {
  id: string
  name: string
}

export interface SaveSubscriptionPlanInput {
  planId: string | null
  name: string
  description: string | null
  monthlyPrice: number
  items: Array<{
    itemType: SubscriptionItemType
    serviceId: string | null
    addOnId: string | null
    monthlyLimit: number | null
  }>
}

export interface SubscriptionAdminFlags {
  adminEnabled: boolean
  bookingEnabled: boolean
  settlementEnabled: boolean
}
