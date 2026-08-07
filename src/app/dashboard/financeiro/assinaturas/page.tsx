import { getBarbershopId } from '@/utils/get-barbershop'
import {
  mapSubscriptionCycleRow,
  mapSubscriptionPlanRow,
  mapSubscriptionRow,
  type SubscriptionCycleRow,
  type SubscriptionPlanRow,
  type SubscriptionRow,
} from './subscription-mappers'
import { SubscriptionsClient } from './subscriptions-client'
import type { SubscriptionCatalogOption } from './types'

interface SettingsRow {
  client_subscriptions_admin_enabled: boolean
  client_subscriptions_booking_enabled: boolean
  client_subscriptions_settlement_enabled: boolean
}

export default async function ClientSubscriptionsPage() {
  const { supabase, barbershopId } = await getBarbershopId()
  const { data: settings, error: settingsError } = await supabase
    .from('barbershop_settings')
    .select(
      'client_subscriptions_admin_enabled, client_subscriptions_booking_enabled, client_subscriptions_settlement_enabled',
    )
    .eq('barbershop_id', barbershopId)
    .maybeSingle()

  if (settingsError) throw new Error(settingsError.message)

  const flags = (settings as SettingsRow | null) ?? {
    client_subscriptions_admin_enabled: false,
    client_subscriptions_booking_enabled: false,
    client_subscriptions_settlement_enabled: false,
  }

  if (!flags.client_subscriptions_admin_enabled) {
    return (
      <SubscriptionsClient
        enabled={false}
        plans={[]}
        subscribers={[]}
        cycles={[]}
        clients={[]}
        services={[]}
        addOns={[]}
      />
    )
  }

  const [
    plansResult,
    subscribersResult,
    cyclesResult,
    clientsResult,
    servicesResult,
    addOnsResult,
  ] = await Promise.all([
    supabase
      .from('subscription_plans')
      .select(
        'id, name, description, monthly_price, is_active, configuration_version, subscription_plan_items(id, item_type, service_id, add_on_id, monthly_limit, services(name), add_ons(name))',
      )
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false }),
    supabase
      .from('client_subscriptions')
      .select(
        'id, client_id, plan_id, pending_plan_id, status, started_on, next_billing_date, clients(name), subscription_plans!client_subscriptions_plan_tenant_fkey(name), pending_plan:subscription_plans!client_subscriptions_pending_plan_tenant_fkey(name)',
      )
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false }),
    supabase
      .from('subscription_cycles')
      .select(
        'id, client_subscription_id, plan_name_snapshot, period_start, period_end, status, price_snapshot, payment_method, paid_at, client_subscriptions!subscription_cycles_subscription_tenant_fkey(clients(name))',
      )
      .eq('barbershop_id', barbershopId)
      .order('period_start', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .order('name'),
    supabase
      .from('services')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('add_ons')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('name'),
  ])

  const firstError = [
    plansResult.error,
    subscribersResult.error,
    cyclesResult.error,
    clientsResult.error,
    servicesResult.error,
    addOnsResult.error,
  ].find(Boolean)
  if (firstError) throw new Error(firstError.message)

  return (
    <SubscriptionsClient
      enabled
      plans={(plansResult.data as SubscriptionPlanRow[]).map(
        mapSubscriptionPlanRow,
      )}
      subscribers={(subscribersResult.data as SubscriptionRow[]).map(
        mapSubscriptionRow,
      )}
      cycles={(cyclesResult.data as SubscriptionCycleRow[]).map(
        mapSubscriptionCycleRow,
      )}
      clients={clientsResult.data as SubscriptionCatalogOption[]}
      services={servicesResult.data as SubscriptionCatalogOption[]}
      addOns={addOnsResult.data as SubscriptionCatalogOption[]}
    />
  )
}
