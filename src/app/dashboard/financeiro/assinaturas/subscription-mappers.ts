import type {
  ClientSubscriber,
  SubscriptionCycle,
  SubscriptionPlan,
  SubscriptionStatus,
} from './types'

type Relation<T> = T | T[] | null

function firstRelation<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation
}

export interface SubscriptionRow {
  id: string
  client_id: string
  plan_id: string
  pending_plan_id: string | null
  status: string
  started_on: string
  next_billing_date: string
  clients: Relation<{ name: string }>
  subscription_plans: Relation<{ name: string }>
  pending_plan: Relation<{ name: string }> | null
}

export interface SubscriptionPlanRow {
  id: string
  name: string
  description: string | null
  monthly_price: number | string
  is_active: boolean
  configuration_version: number | string
  subscription_plan_items: Array<{
    id: string
    item_type: 'service' | 'add_on'
    service_id: string | null
    add_on_id: string | null
    monthly_limit: number | null
    services: Relation<{ name: string }>
    add_ons: Relation<{ name: string }>
  }>
}

export interface SubscriptionCycleRow {
  id: string
  client_subscription_id: string
  plan_name_snapshot: string
  period_start: string
  period_end: string
  status: string
  price_snapshot: number | string
  payment_method: SubscriptionCycle['paymentMethod']
  paid_at: string | null
  client_subscriptions: Relation<{
    clients: Relation<{ name: string }>
  }>
}

export function mapSubscriptionRow(row: SubscriptionRow): ClientSubscriber {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: firstRelation(row.clients)?.name ?? 'Cliente',
    planId: row.plan_id,
    planName: firstRelation(row.subscription_plans)?.name ?? 'Plano',
    status: row.status as SubscriptionStatus,
    startedOn: row.started_on,
    nextBillingDate: row.next_billing_date,
    pendingPlanId: row.pending_plan_id,
    pendingPlanName: firstRelation(row.pending_plan)?.name ?? null,
  }
}

export function mapSubscriptionPlanRow(
  row: SubscriptionPlanRow,
): SubscriptionPlan {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    monthlyPrice: Number(row.monthly_price),
    isActive: row.is_active,
    configurationVersion: Number(row.configuration_version),
    items: (row.subscription_plan_items ?? []).map((item) => ({
      id: item.id,
      itemType: item.item_type,
      serviceId: item.service_id,
      addOnId: item.add_on_id,
      targetName:
        firstRelation(item.services)?.name ??
        firstRelation(item.add_ons)?.name ??
        'Benefício',
      monthlyLimit: item.monthly_limit,
    })),
  }
}

export function mapSubscriptionCycleRow(
  row: SubscriptionCycleRow,
): SubscriptionCycle {
  const subscription = firstRelation(row.client_subscriptions)
  return {
    id: row.id,
    subscriptionId: row.client_subscription_id,
    clientName: firstRelation(subscription?.clients ?? null)?.name ?? 'Cliente',
    planName: row.plan_name_snapshot,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    amount: Number(row.price_snapshot),
    paymentMethod: row.payment_method,
    paidAt: row.paid_at,
  }
}
