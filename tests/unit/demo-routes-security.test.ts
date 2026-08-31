import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), getSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn(),
  registry: vi.fn(), rpc: vi.fn(), admin: vi.fn(), staged: vi.fn(),
}))
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => ({ auth: {
  getUser: mocks.getUser, getSession: mocks.getSession, signOut: mocks.signOut,
} }) }))
vi.mock('@/lib/demo-server', () => ({ getConfiguredDemo: mocks.registry }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: mocks.admin }))
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.staged }))
import { POST as enterDemo } from '@/app/auth/demo/route'
import { POST as signOut } from '@/app/auth/signout/route'
import { GET as resetDemo } from '@/app/api/cron/reset-demo/route'

const request = (origin: string | null = 'https://headbarber.test') => new Request('https://headbarber.test/auth/demo', {
  method: 'POST', headers: origin === null ? {} : { origin },
})
const cronRequest = (secret = 'test-cron') => new Request('https://headbarber.test/api/cron/reset-demo', {
  headers: { authorization: `Bearer ${secret}` },
})
describe('demo routes fail closed', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('DEMO_ACCOUNT_EMAIL', 'demo@example.com')
    vi.stubEnv('DEMO_ACCOUNT_PASSWORD', 'test-password')
    vi.stubEnv('CRON_SECRET', 'test-cron')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    mocks.registry.mockResolvedValue({ user_id: 'demo-user', barbershop_id: 'demo-shop' })
    mocks.signIn.mockResolvedValue({ data: { user: { id: 'demo-user' }, session: {} }, error: null })
    mocks.rpc.mockResolvedValue({ error: null })
    mocks.admin.mockReturnValue({ rpc: mocks.rpc })
    mocks.staged.mockImplementation((_url, _key, { cookies }) => {
      cookies.setAll([{ name: 'sb-test-auth-token', value: 'sensitive-token', options: { path: '/' } }])
      return { auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut } }
    })
  })
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

  it.each(['https://attacker.test', 'not-a-url', 'null', null])('rejects unsafe origin %s without signing in', async (origin) => {
    expect((await enterDemo(request(origin))).status).toBe(403)
    expect(mocks.signIn).not.toHaveBeenCalled()
  })
  it('preserves an existing real session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'real-user' } } })
    const response = await enterDemo(request())
    expect(response.headers.get('location')).toBe('https://headbarber.test/dashboard')
    expect(mocks.registry).not.toHaveBeenCalled()
    expect(mocks.signIn).not.toHaveBeenCalled()
    expect(response.headers.get('set-cookie')).toBeNull()
  })
  it('does not sign in if configuration/registry is invalid', async () => {
    mocks.registry.mockRejectedValue(new Error('invalid configuration'))
    const response = await enterDemo(request())
    expect(response.headers.get('location')).toContain('/demo?error=unavailable')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(mocks.signIn).not.toHaveBeenCalled()
  })
  it('does not replace a session when Auth cannot validate it', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('network unavailable') })
    expect((await enterDemo(request())).headers.get('location')).toContain('/demo?error=unavailable')
    expect(mocks.signIn).not.toHaveBeenCalled()
  })
  it('never publishes cookies for the wrong authenticated identity', async () => {
    mocks.signIn.mockResolvedValue({ data: { user: { id: 'real-user' }, session: {} }, error: null })
    const response = await enterDemo(request())
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('location')).toContain('/demo?error=unavailable')
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
  it('never publishes cookies on a failed sign-in', async () => {
    mocks.signIn.mockResolvedValue({ data: { user: null, session: null }, error: new Error('bad password') })
    expect((await enterDemo(request())).headers.get('set-cookie')).toBeNull()
  })
  it('publishes cookies only after identity validation, without caching', async () => {
    const response = await enterDemo(request())
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://headbarber.test/dashboard')
    expect(response.headers.get('set-cookie')).toContain('sb-test-auth-token=')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('signs out only the current browser session with a GET redirect', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: {} } })
    expect((await signOut(request())).status).toBe(303)
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
  it('rejects cron calls without the configured secret', async () => {
    expect((await resetDemo(cronRequest('wrong'))).status).toBe(401)
    expect(mocks.admin).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('does not reset anything when registry validation fails', async () => {
    mocks.registry.mockRejectedValue(new Error('wrong account'))
    expect((await resetDemo(cronRequest())).status).toBe(500)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('resets exactly the registered tenant', async () => {
    const response = await resetDemo(cronRequest())
    expect(await response.json()).toEqual({ ok: true, reset: 1 })
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('reset_demo_activity', { p_barbershop_id: 'demo-shop' })
  })
})
