import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieveSubscription: vi.fn(),
  syncSubscription: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.retrieveSubscription },
  }),
}))

vi.mock('@/lib/stripe-subscriptions', () => ({
  syncStripeSubscription: mocks.syncSubscription,
}))

import { POST } from '@/app/api/stripe/webhook/route'

function subscription(id: string, status: Stripe.Subscription.Status) {
  return {
    id,
    object: 'subscription',
    status,
  } as Stripe.Subscription
}

describe('Stripe subscription webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('retrieves the current subscription before syncing a snapshot event', async () => {
    const eventSubscription = subscription('sub_123', 'incomplete')
    const currentSubscription = subscription('sub_123', 'active')
    const event = {
      id: 'evt_123',
      object: 'event',
      api_version: '2026-05-27.dahlia',
      created: 1,
      data: { object: eventSubscription },
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: 'customer.subscription.updated',
    } as Stripe.Event

    mocks.constructEvent.mockReturnValue(event)
    mocks.retrieveSubscription.mockResolvedValue(currentSubscription)

    const response = await POST(new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'test-signature' },
      body: JSON.stringify(event),
    }))

    expect(response.status).toBe(200)
    expect(mocks.retrieveSubscription).toHaveBeenCalledWith('sub_123')
    expect(mocks.syncSubscription).toHaveBeenCalledWith(currentSubscription)
  })
})
