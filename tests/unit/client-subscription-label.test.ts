import { describe, expect, it } from 'vitest'
import { getClientSubscriptionLabel } from '@/app/dashboard/clientes/client-subscription-label'

describe('client subscription label', () => {
  it('shows the active plan name for subscribers', () => {
    expect(getClientSubscriptionLabel('Clube Executivo')).toEqual({
      label: 'Clube Executivo',
      isSubscriber: true,
    })
  })

  it('shows Regular when no active plan was supplied', () => {
    expect(getClientSubscriptionLabel(null)).toEqual({
      label: 'Regular',
      isSubscriber: false,
    })
  })
})
