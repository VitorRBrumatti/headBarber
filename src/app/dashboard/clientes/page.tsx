import { getBarbershopId } from '@/utils/get-barbershop'
import { ClientesClient } from './clientes-client'

export default async function ClientesPage() {
  const { supabase, barbershopId } = await getBarbershopId()

  const [clientsResult, subscriptionsResult] = await Promise.all([
    supabase
      .from('clients')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false }),
    supabase
      .from('client_subscriptions')
      .select(
        'client_id, subscription_plans!client_subscriptions_plan_tenant_fkey(name)',
      )
      .eq('barbershop_id', barbershopId)
      .eq('status', 'active'),
  ])

  if (clientsResult.error) throw new Error(clientsResult.error.message)
  if (subscriptionsResult.error) {
    throw new Error(subscriptionsResult.error.message)
  }

  const activePlanNamesByClientId = Object.fromEntries(
    (subscriptionsResult.data ?? []).flatMap((subscription) => {
      const relation = subscription.subscription_plans
      const plan = Array.isArray(relation) ? relation[0] : relation
      return plan?.name ? [[subscription.client_id, plan.name]] : []
    }),
  )

  return (
    <div className="space-y-6">
      <ClientesClient
        activePlanNamesByClientId={activePlanNamesByClientId}
        clients={clientsResult.data ?? []}
      />
    </div>
  )
}
