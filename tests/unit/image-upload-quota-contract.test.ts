import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationDirectory = join(process.cwd(), 'supabase', 'migrations')

function quotaMigration() {
  const filename = readdirSync(migrationDirectory).find((name) =>
    name.endsWith('_image_upload_quota.sql'),
  )

  expect(filename).toBeDefined()
  return readFileSync(join(migrationDirectory, filename!), 'utf8')
}

describe('image upload quota migration', () => {
  it('exposes only an authenticated atomic quota function', () => {
    const sql = quotaMigration()

    expect(sql).toContain('create table public.image_upload_attempts')
    expect(sql).toContain('enable row level security')
    expect(sql).toContain(
      'create or replace function public.consume_image_upload_quota',
    )
    expect(sql).toContain('revoke all on public.image_upload_attempts')
    expect(sql).toMatch(
      /grant execute on function public\.consume_image_upload_quota\(uuid\)\s+to authenticated/,
    )
    expect(sql).toContain('public.get_user_barbershop_id')
    expect(sql).toContain('pg_advisory_xact_lock')
  })
})
