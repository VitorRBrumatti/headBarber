import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  maybeSingle: vi.fn(),
  profile: vi.fn(),
  upsert: vi.fn(),
  createCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user_123', email: 'owner@example.com', user_metadata: {} } },
      }),
    },
  }),
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle, single: mocks.profile }),
      }),
      upsert: mocks.upsert,
    }),
  }),
}))

vi.mock('@/lib/stripe', () => ({
  getAppUrl: () => 'http://localhost:3000',
  getStripe: () => ({
    customers: { create: mocks.createCustomer },
    checkout: { sessions: { create: mocks.createCheckoutSession } },
    billingPortal: { sessions: { create: mocks.createPortalSession } },
  }),
}))

import { createBillingPortalSession, createCheckoutSession } from '@/app/plans/actions'

describe('createCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.profile.mockResolvedValue({ data: { demo_mode: false }, error: null })
    process.env.STRIPE_MONTHLY_PRICE_ID = 'price_monthly'
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'subscriptions relation is unavailable' },
    })
    mocks.createCustomer.mockResolvedValue({ id: 'cus_123' })
    mocks.upsert.mockResolvedValue({ error: { message: 'subscriptions relation is unavailable' } })
  })

  it('does not create a Stripe customer when the subscription store is unavailable', async () => {
    const formData = new FormData()
    formData.set('plan', 'monthly')

    await expect(createCheckoutSession(formData)).rejects.toThrow(
      'NEXT_REDIRECT:/plans?error=billing-unavailable',
    )
    expect(mocks.createCustomer).not.toHaveBeenCalled()
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('blocks demo checkout even when called directly as a server action', async () => {
    mocks.profile.mockResolvedValue({ data: { demo_mode: true }, error: null })
    const formData = new FormData()
    formData.set('plan', 'monthly')
    await expect(createCheckoutSession(formData)).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.createCustomer).not.toHaveBeenCalled()
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('blocks the billing portal for demo sessions', async () => {
    mocks.profile.mockResolvedValue({ data: { demo_mode: true }, error: null })
    await expect(createBillingPortalSession()).rejects.toThrow('NEXT_REDIRECT:/dashboard')
    expect(mocks.createPortalSession).not.toHaveBeenCalled()
  })

  it('blocks billing when the demo status cannot be verified', async () => {
    mocks.profile.mockResolvedValue({ data: null, error: new Error('unavailable') })
    await expect(createBillingPortalSession()).rejects.toThrow('NEXT_REDIRECT:/plans?error=billing-unavailable')
    expect(mocks.createPortalSession).not.toHaveBeenCalled()
  })
})
