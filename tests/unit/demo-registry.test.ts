import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ from: vi.fn(), account: vi.fn() }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: mocks.from, auth: { admin: { getUserById: mocks.account } } }) }))
import { getConfiguredDemo } from '@/lib/demo-server'

describe('server-side demo identity verification', () => {
  let data: Record<string, unknown>
  beforeEach(() => {
    vi.stubEnv('DEMO_ACCOUNT_EMAIL', 'demo@example.com')
    vi.stubEnv('DEMO_BOOKING_SLUG', 'demo-slug')
    data = {
      demo_accounts: { user_id: 'demo-user', barbershop_id: 'demo-shop' },
      profiles: { demo_mode: true, role: 'owner', barbershop_id: 'demo-shop' },
      barbershops: { slug: 'demo-slug' }, subscriptions: null,
    }
    mocks.account.mockResolvedValue({ data: { user: { email: 'demo@example.com', email_confirmed_at: '2026-01-01' } }, error: null })
    mocks.from.mockImplementation((table) => {
      const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: data[table], error: null }), maybeSingle: async () => ({ data: data[table], error: null }) }
      return chain
    })
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
  it('accepts only the configured registered demo', async () => {
    await expect(getConfiguredDemo()).resolves.toEqual({ user_id: 'demo-user', barbershop_id: 'demo-shop' })
  })
  it.each([
    ['demo_accounts', null],
    ['profiles', { demo_mode: false, role: 'owner', barbershop_id: 'demo-shop' }],
    ['profiles', { demo_mode: true, role: 'owner', barbershop_id: 'real-shop' }],
    ['barbershops', { slug: 'real-slug' }],
    ['subscriptions', { stripe_customer_id: 'cus_real' }],
  ])('rejects inconsistent %s', async (table, value) => {
    data[table as string] = value
    await expect(getConfiguredDemo()).rejects.toThrow()
  })
  it('rejects a real account even if email environment variables were changed', async () => {
    vi.stubEnv('DEMO_ACCOUNT_EMAIL', 'real@example.com')
    await expect(getConfiguredDemo()).rejects.toThrow('Demo identity')
  })
  it('rejects lookup failures rather than falling back to profiles', async () => {
    mocks.account.mockResolvedValue({ data: { user: null }, error: new Error('unavailable') })
    await expect(getConfiguredDemo()).rejects.toThrow()
  })
})
