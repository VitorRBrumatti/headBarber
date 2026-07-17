import Stripe from 'stripe'

let stripeClient: Stripe | undefined

const stripeServerKeyPrefixes = [
  'sk_test_',
  'sk_live_',
  'rk_test_',
  'rk_live_',
] as const

function isStripeServerKey(value?: string): value is string {
  return Boolean(value && stripeServerKeyPrefixes.some((prefix) => value.startsWith(prefix)))
}

export function isBillingEnvironmentConfigured(
  environment: Partial<NodeJS.ProcessEnv> = process.env,
) {
  return Boolean(
    isStripeServerKey(environment.STRIPE_SECRET_KEY) &&
    environment.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') &&
    environment.STRIPE_MONTHLY_PRICE_ID?.startsWith('price_') &&
    environment.STRIPE_ANNUAL_PRICE_ID?.startsWith('price_') &&
    environment.SUPABASE_SERVICE_ROLE_KEY,
  )
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!isStripeServerKey(secretKey)) {
    throw new Error('A valid Stripe server key is not configured')
  }

  stripeClient ??= new Stripe(secretKey, {
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  })

  return stripeClient
}

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  return 'http://localhost:3000'
}
