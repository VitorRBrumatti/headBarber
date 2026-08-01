import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteResult: { data: null as { id: string } | null, error: null },
  eq: vi.fn(),
}))

const datasets: Record<string, unknown[]> = {
  revenues: [
    {
      id: 'subscription-revenue',
      category: 'monthly_plan',
      source: 'subscription_cycle',
      amount: 149,
      date: '2026-08-01',
    },
  ],
  expenses: [],
  appointments: [
    {
      id: 'covered-appointment',
      total_price: 50,
      subscription_covered_total: 50,
      commission_amount: 15,
    },
  ],
  product_sales: [],
  client_subscriptions: [
    {
      id: 'subscriber-1',
      status: 'active',
      next_billing_date: '2026-08-20',
    },
  ],
  appointment_subscription_allocations: [
    {
      appointment_id: 'covered-appointment',
      covered_amount: 50,
      status: 'consumed',
    },
  ],
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/utils/get-barbershop', () => ({
  getBarbershopId: vi.fn(async () => ({
    barbershopId: 'shop-1',
    supabase: {
      from: vi.fn((table: string) => {
        const query = {
          select: vi.fn(() => query),
          delete: vi.fn(() => query),
          eq: vi.fn((column: string, value: unknown) => {
            mocks.eq(table, column, value)
            return query
          }),
          gte: vi.fn(() => query),
          lte: vi.fn(() => query),
          order: vi.fn(() => query),
          maybeSingle: vi.fn(async () => mocks.deleteResult),
          then: (onfulfilled: (value: unknown) => unknown) =>
            Promise.resolve({ data: datasets[table] ?? [], error: null }).then(
              onfulfilled,
            ),
        }
        return query
      }),
    },
  })),
}))

import {
  deleteManualRevenueAction,
  getFinancialOverview,
} from '@/app/dashboard/financeiro/actions'

describe('subscription financial metrics', () => {
  beforeEach(() => {
    mocks.deleteResult = { data: null, error: null }
    mocks.eq.mockClear()
  })

  it('keeps covered attendance operational and subscription revenue financial', async () => {
    const overview = await getFinancialOverview('2026-08-01', '2026-08-31')

    expect(overview.completedAppointmentsCount).toBe(1)
    expect(overview.averageTicket).toBe(50)
    expect(overview.subscriptionRevenue).toBe(149)
    expect(overview.activeSubscribers).toBe(1)
    expect(overview.renewalsDue).toBe(1)
    expect(overview.coveredAppointmentsCount).toBe(1)
    expect(overview.coveredAttendanceValue).toBe(50)
    expect(overview.averageConsumptionPerSubscriber).toBe(1)
    expect(overview.averageRevenuePerSubscriber).toBe(149)
    expect(overview.provisionedCommissions).toBe(15)
    expect(overview.totalRevenues).toBe(149)
  })

  it('presents subscription revenue separately from operational coverage', () => {
    const client = readFileSync(
      resolve(
        process.cwd(),
        'src/app/dashboard/financeiro/financeiro-client.tsx',
      ),
      'utf8',
    )
    const drawer = readFileSync(
      resolve(
        process.cwd(),
        'src/app/dashboard/financeiro/financial-entry-drawer.tsx',
      ),
      'utf8',
    )

    expect(client).toContain('Receita de assinaturas')
    expect(client).toContain('overview.subscriptionRevenue')
    expect(client).toContain('Cobertura utilizada')
    expect(client).toContain('overview.coveredAttendanceValue')
    expect(client).toContain("revenue.source === 'manual'")
    expect(drawer).toContain('somente receitas manuais')
  })
  it('refuses to delete an automatic revenue', async () => {
    await expect(
      deleteManualRevenueAction('subscription-revenue'),
    ).rejects.toThrow('Somente receitas manuais podem ser removidas.')
    expect(mocks.eq).toHaveBeenCalledWith('revenues', 'source', 'manual')
  })

  it('deletes a revenue only when the manual source matches', async () => {
    mocks.deleteResult = { data: { id: 'manual-revenue' }, error: null }

    await expect(
      deleteManualRevenueAction('manual-revenue'),
    ).resolves.toBeUndefined()
    expect(mocks.eq).toHaveBeenCalledWith('revenues', 'source', 'manual')
  })
})
