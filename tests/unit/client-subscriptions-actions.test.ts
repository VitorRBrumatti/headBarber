import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, revalidatePath, getBarbershopId } = vi.hoisted(() => {
  const rpc = vi.fn()
  return {
    rpc,
    revalidatePath: vi.fn(),
    getBarbershopId: vi.fn(async () => ({
      barbershopId: 'shop-1',
      supabase: { rpc },
    })),
  }
})

vi.mock('next/cache', () => ({ revalidatePath }))
vi.mock('@/utils/get-barbershop', () => ({ getBarbershopId }))

import {
  registerSubscriptionPaymentAction,
  saveSubscriptionPlanAction,
  setSubscriptionStatusAction,
} from '@/app/dashboard/financeiro/assinaturas/actions'

describe('client subscription actions', () => {
  beforeEach(() => {
    rpc.mockReset()
    revalidatePath.mockReset()
    getBarbershopId.mockClear()
  })

  it('sends the authoritative payment payload and revalidates consumers', async () => {
    rpc.mockResolvedValue({
      data: { cycleId: 'cycle-1', revenueId: 'revenue-1' },
      error: null,
    })

    await expect(
      registerSubscriptionPaymentAction({
        subscriptionId: 'sub-1',
        periodStart: '2026-09-01',
        paymentMethod: 'pix',
      }),
    ).resolves.toEqual({
      success: true,
      data: { cycleId: 'cycle-1', revenueId: 'revenue-1' },
    })

    expect(getBarbershopId).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('register_client_subscription_payment', {
      p_subscription_id: 'sub-1',
      p_period_start: '2026-09-01',
      p_payment_method: 'pix',
    })
    expect(revalidatePath.mock.calls).toEqual([
      ['/dashboard/financeiro/assinaturas'],
      ['/dashboard/financeiro'],
      ['/dashboard/agenda'],
    ])
  })

  it('maps known database errors to a stable result', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'P0001: PAYMENT_CONFLICT' },
    })

    await expect(
      registerSubscriptionPaymentAction({
        subscriptionId: 'sub-1',
        periodStart: '2026-10-01',
        paymentMethod: 'money',
      }),
    ).resolves.toEqual({
      success: false,
      code: 'PAYMENT_CONFLICT',
      error: 'A data informada não corresponde à próxima cobrança.',
    })
  })

  it('saves plan benefits with the database field contract', async () => {
    rpc.mockResolvedValue({ data: 'plan-1', error: null })

    await saveSubscriptionPlanAction({
      planId: null,
      name: 'Premium',
      description: 'Plano principal',
      monthlyPrice: 149,
      items: [
        {
          itemType: 'service',
          serviceId: 'service-1',
          addOnId: null,
          monthlyLimit: 2,
        },
      ],
    })

    expect(rpc).toHaveBeenCalledWith('save_subscription_plan', {
      p_plan_id: null,
      p_name: 'Premium',
      p_description: 'Plano principal',
      p_monthly_price: 149,
      p_items: [
        {
          itemType: 'service',
          serviceId: 'service-1',
          monthlyLimit: 2,
        },
      ],
    })
  })

  it('maps terminal status transition failures', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'INVALID_STATUS_TRANSITION' },
    })

    await expect(
      setSubscriptionStatusAction({
        subscriptionId: 'sub-1',
        status: 'active',
      }),
    ).resolves.toEqual({
      success: false,
      code: 'INVALID_STATUS_TRANSITION',
      error: 'Essa mudança de status não é permitida.',
    })
  })
})
