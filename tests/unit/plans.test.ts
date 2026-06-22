import { describe, expect, it } from 'vitest'
import { formatPlanAmount, hasProductAccess, isBillingPlan } from '@/lib/plans'

describe('billing plans', () => {
  it('only accepts supported plan identifiers', () => {
    expect(isBillingPlan('monthly')).toBe(true)
    expect(isBillingPlan('annual')).toBe(true)
    expect(isBillingPlan('price_injected')).toBe(false)
  })

  it('only grants product access to active subscriptions and trials', () => {
    expect(hasProductAccess('active')).toBe(true)
    expect(hasProductAccess('trialing')).toBe(true)
    expect(hasProductAccess('past_due')).toBe(false)
    expect(hasProductAccess('canceled')).toBe(false)
    expect(hasProductAccess(null)).toBe(false)
  })

  it('formats Stripe minor units as Brazilian currency', () => {
    expect(formatPlanAmount(2490)).toContain('24,90')
    expect(formatPlanAmount(24999)).toContain('249,99')
  })
})
