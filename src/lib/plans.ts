export type BillingPlan = 'monthly' | 'annual'

export const PLAN_DETAILS = {
  monthly: {
    name: 'Plano Profissional',
    eyebrow: 'Recorrência mensal',
    amount: 2490,
    currency: 'BRL',
    suffix: '/mês',
    interval: 'month',
  },
  annual: {
    name: 'Plano Profissional',
    eyebrow: 'Recorrência anual',
    amount: 24999,
    currency: 'BRL',
    suffix: '/ano',
    interval: 'year',
  },
} as const

export function getPriceId(plan: BillingPlan) {
  const priceId = plan === 'monthly'
    ? process.env.STRIPE_MONTHLY_PRICE_ID
    : process.env.STRIPE_ANNUAL_PRICE_ID

  if (!priceId) {
    throw new Error(`Stripe price for ${plan} is not configured`)
  }

  return priceId
}

export function isBillingPlan(value: unknown): value is BillingPlan {
  return value === 'monthly' || value === 'annual'
}

export function hasProductAccess(status?: string | null) {
  return status === 'active' || status === 'trialing'
}

export function formatPlanAmount(amount: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)
}
