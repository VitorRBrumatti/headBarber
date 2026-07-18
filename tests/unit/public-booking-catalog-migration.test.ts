import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('public booking catalog migration', () => {
  it('lets anonymous visitors read only active services and barbers', () => {
    const migrationName = readdirSync(resolve(process.cwd(), 'supabase/migrations'))
      .find((name) => name.endsWith('_public_booking_catalog.sql'))

    expect(migrationName).toBeDefined()

    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations', migrationName!),
      'utf8',
    ).toLowerCase()

    for (const table of ['services', 'barbers']) {
      expect(migration).toContain(`on public.${table} for select to anon`)
      expect(migration).toContain(`grant select on public.${table} to anon`)
    }

    expect(migration.match(/using \(is_active = true\)/g)).toHaveLength(2)
  })
})
