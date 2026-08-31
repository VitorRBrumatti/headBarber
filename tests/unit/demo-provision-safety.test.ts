import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareDemoAccount, writeDemoRows } from '../../scripts/lib/demo-provision.mjs'

describe('demo provisioner preflight', () => {
  let rows: Record<string, unknown>
  const write = vi.fn()
  const listUsers = vi.fn()
  const createUser = vi.fn()
  const updateUserById = vi.fn()
  const getUserById = vi.fn()
  const settings = { email: 'demo@example.com', password: 'strong-demo-password', slug: 'demo' }
  const supabase = {
    auth: { admin: { listUsers, createUser, updateUserById, getUserById } },
    from: (table: string) => {
      const chain = {
        select: () => chain, eq: () => chain, in: () => chain,
        insert: (value: unknown) => { write(table, value); return chain },
        update: (value: unknown) => { write(table, value); return chain },
        single: async () => ({ data: table === 'profiles' && Array.isArray(rows[table]) ? rows[table][0] : rows[table], error: null }),
        maybeSingle: async () => ({ data: rows[table], error: null }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows[table], error: null }).then(resolve),
      }
      return chain
    },
  }
  beforeEach(() => {
    vi.resetAllMocks()
    rows = { demo_accounts: null, barbershops: null, services: [], barbers: [], clients: [] }
    listUsers.mockResolvedValue({ data: { users: [] }, error: null })
  })
  it('does not adopt a preexisting account or rotate its password', async () => {
    listUsers.mockResolvedValue({ data: { users: [{ email: settings.email }] }, error: null })
    await expect(prepareDemoAccount(supabase, settings)).rejects.toThrow('Conta existente')
    expect(createUser).not.toHaveBeenCalled()
    expect(updateUserById).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
  it('checks users beyond the first page before creating anything', async () => {
    listUsers.mockResolvedValueOnce({ data: { users: Array.from({ length: 1000 }, (_, i) => ({ email: `${i}@example.com` })) }, error: null })
      .mockResolvedValueOnce({ data: { users: [{ email: settings.email }] }, error: null })
    await expect(prepareDemoAccount(supabase, settings)).rejects.toThrow('Conta existente')
    expect(listUsers).toHaveBeenLastCalledWith({ page: 2, perPage: 1000 })
    expect(createUser).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
  it('refuses a preexisting unregistered shop before creating an account', async () => {
    rows.barbershops = { id: 'real-shop', slug: 'demo' }
    await expect(prepareDemoAccount(supabase, settings)).rejects.toThrow('slug já pertence')
    expect(createUser).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
  it.each(['clients', 'services', 'barbers'])('refuses cross-tenant seed collisions in %s', async (table) => {
    rows[table] = [{ id: 'seed-id', barbershop_id: 'real-shop' }]
    await expect(prepareDemoAccount(supabase, settings)).rejects.toThrow('Colisão de IDs')
    expect(createUser).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
  it('reuses only the exact registered account without changing its credentials', async () => {
    rows.demo_accounts = { user_id: 'demo-user', barbershop_id: 'demo-shop' }
    rows.barbershops = { id: 'demo-shop', slug: 'demo' }
    rows.profiles = [{ id: 'demo-user', barbershop_id: 'demo-shop', demo_mode: true, role: 'owner' }]
    rows.subscriptions = null
    getUserById.mockResolvedValue({ data: { user: { id: 'demo-user', email: settings.email, email_confirmed_at: '2026-01-01' } }, error: null })
    await expect(prepareDemoAccount(supabase, settings)).resolves.toMatchObject({ user: { id: 'demo-user' }, shop: { id: 'demo-shop' } })
    expect(updateUserById).not.toHaveBeenCalled()
    expect(createUser).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
  it('fails closed when the registry/migration is unavailable', async () => {
    const unavailable = { ...supabase, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'table missing' } }) }) }) }) }
    await expect(prepareDemoAccount(unavailable, settings)).rejects.toThrow('migração')
    expect(createUser).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
})

describe('tenant-scoped catalog writes', () => {
  it('never overwrites a collided seed belonging to another tenant', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn()
    const query = {
      eq, select: () => query,
      single: async () => ({ data: null, error: { message: 'no owned row' } }),
    }
    eq.mockReturnValue(query)
    const supabase = { from: () => ({ upsert, update: () => query }) }
    const rows = [{ id: 'seed-id', barbershop_id: 'demo-shop', name: 'Demo service' }]
    await expect(writeDemoRows(supabase, 'services', rows)).rejects.toThrow('no owned row')
    expect(upsert).toHaveBeenCalledWith(rows, { onConflict: 'id', ignoreDuplicates: true })
    expect(eq).toHaveBeenCalledWith('barbershop_id', 'demo-shop')
    expect(eq).toHaveBeenCalledWith('id', 'seed-id')
  })
})
