import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260817211038_demo_mode.sql',
  ),
  'utf8',
)
const demoRoute = readFileSync(
  join(process.cwd(), 'src', 'app', 'auth', 'demo', 'route.ts'),
  'utf8',
)
const middleware = readFileSync(
  join(process.cwd(), 'src', 'utils', 'supabase', 'middleware.ts'),
  'utf8',
)

describe('demo mode contract', () => {
  it('stores demo authorization in the profile instead of user metadata', () => {
    expect(migration).toMatch(
      /alter table public\.profiles[\s\S]+demo_mode boolean not null default false/i,
    )
    expect(migration).not.toMatch(/raw_user_meta_data[\s\S]+demo_mode/i)
  })

  it('protects structural tables while keeping booking inserts available', () => {
    expect(migration).toContain('private.reject_demo_mutation()')
    expect(migration).toMatch(
      /create trigger reject_demo_mutation before insert or update or delete/i,
    )
    expect(migration).toMatch(
      /create trigger reject_demo_update_or_delete before update or delete/i,
    )
    expect(migration).toContain("'clients'")
    expect(migration).toContain("'appointments'")
  })

  it('keeps shared credentials on the server and uses a POST entry point', () => {
    expect(demoRoute).toContain('export async function POST')
    expect(demoRoute).toContain('process.env.DEMO_ACCOUNT_EMAIL')
    expect(demoRoute).toContain('process.env.DEMO_ACCOUNT_PASSWORD')
    expect(demoRoute).not.toContain('NEXT_PUBLIC_DEMO_ACCOUNT_PASSWORD')
  })

  it('bypasses billing only for database-marked demo profiles', () => {
    expect(middleware).toContain(".select('barbershop_id, demo_mode')")
    expect(middleware).toContain('isDemo || hasProductAccess')
  })
})
