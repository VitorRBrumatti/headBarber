import { afterEach, describe, expect, it, vi } from 'vitest'

const originalSecretKey = process.env.STRIPE_SECRET_KEY

afterEach(() => {
  if (originalSecretKey === undefined) {
    delete process.env.STRIPE_SECRET_KEY
  } else {
    process.env.STRIPE_SECRET_KEY = originalSecretKey
  }

  vi.resetModules()
})

describe('Stripe configuration', () => {
  it('rejects a value that is not a Stripe server key before creating the client', async () => {
    process.env.STRIPE_SECRET_KEY = 'mk_not_a_stripe_secret_key'
    const { getStripe } = await import('@/lib/stripe')

    expect(() => getStripe()).toThrow(/Stripe server key/i)
  })

  it('only reports billing as configured when every server credential has a valid format', async () => {
    const stripeModule = await import('@/lib/stripe')

    expect(stripeModule.isBillingEnvironmentConfigured).toBeTypeOf('function')
    const isBillingEnvironmentConfigured = stripeModule.isBillingEnvironmentConfigured

    const validEnvironment = {
      STRIPE_SECRET_KEY: 'sk_test_valid_for_format_check',
      STRIPE_WEBHOOK_SECRET: 'whsec_valid_for_format_check',
      STRIPE_MONTHLY_PRICE_ID: 'price_monthly_valid',
      STRIPE_ANNUAL_PRICE_ID: 'price_annual_valid',
      SUPABASE_SERVICE_ROLE_KEY: 'server-only-key',
    }

    expect(isBillingEnvironmentConfigured(validEnvironment)).toBe(true)
    expect(isBillingEnvironmentConfigured({
      ...validEnvironment,
      STRIPE_SECRET_KEY: 'mk_invalid',
    })).toBe(false)
    expect(isBillingEnvironmentConfigured({
      ...validEnvironment,
      STRIPE_WEBHOOK_SECRET: '',
    })).toBe(false)
  })
})
