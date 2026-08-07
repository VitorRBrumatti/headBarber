import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  mapSubscriptionRow,
  type SubscriptionRow,
} from '@/app/dashboard/financeiro/assinaturas/subscription-mappers'
import { SubscriptionsClient } from '@/app/dashboard/financeiro/assinaturas/subscriptions-client'

describe('client subscriptions mapping and UI', () => {
  it('maps nested subscriber data into a stable view model', () => {
    const row: SubscriptionRow = {
      id: 'sub-1',
      status: 'active',
      next_billing_date: '2026-09-01',
      started_on: '2026-08-01',
      client_id: 'client-1',
      plan_id: 'plan-1',
      pending_plan_id: null,
      clients: { name: 'Ana' },
      subscription_plans: { name: 'Premium' },
      pending_plan: null,
    }

    expect(mapSubscriptionRow(row)).toEqual({
      id: 'sub-1',
      clientId: 'client-1',
      clientName: 'Ana',
      planId: 'plan-1',
      planName: 'Premium',
      status: 'active',
      startedOn: '2026-08-01',
      nextBillingDate: '2026-09-01',
      pendingPlanId: null,
      pendingPlanName: null,
    })
  })

  it('hides all mutation controls while the feature flag is disabled', () => {
    const markup = renderToStaticMarkup(
      <SubscriptionsClient
        enabled={false}
        plans={[]}
        subscribers={[]}
        cycles={[]}
        clients={[]}
        services={[]}
        addOns={[]}
      />,
    )

    expect(markup).toContain('Assinaturas ainda não ativadas para esta barbearia')
    expect(markup).not.toContain('Novo plano')
    expect(markup).not.toContain('Registrar pagamento')
  })

  it('renders the four administration areas when enabled', () => {
    const markup = renderToStaticMarkup(
      <SubscriptionsClient
        enabled
        plans={[
          {
            id: 'plan-1',
            name: 'Premium',
            description: null,
            monthlyPrice: 149,
            isActive: true,
            configurationVersion: 1,
            items: [],
          },
        ]}
        subscribers={[
          {
            id: 'sub-1',
            clientId: 'client-1',
            clientName: 'Ana',
            planId: 'plan-1',
            planName: 'Premium',
            status: 'active',
            startedOn: '2026-08-01',
            nextBillingDate: '2026-09-01',
            pendingPlanId: null,
            pendingPlanName: null,
          },
        ]}
        cycles={[]}
        clients={[{ id: 'client-1', name: 'Ana' }]}
        services={[{ id: 'service-1', name: 'Corte' }]}
        addOns={[]}
      />,
    )

    expect(markup).toContain('Visão geral')
    expect(markup).toContain('Planos')
    expect(markup).toContain('Assinantes')
    expect(markup).toContain('Cobranças')
    expect(markup).toContain('Premium')
    expect(markup).toContain('Ana')
  })
})
