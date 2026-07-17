import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Supabase migrations', () => {
  it('creates the base schema before phase 3 tables that reference it', async () => {
    const migrationsDirectory = path.join(process.cwd(), 'supabase', 'migrations')
    const migrations = (await readdir(migrationsDirectory)).sort()
    const initIndex = migrations.findIndex((file) => file.endsWith('_init.sql'))
    const phase3Index = migrations.findIndex((file) => file.endsWith('_phase3_tables.sql'))

    expect(initIndex).toBeGreaterThanOrEqual(0)
    expect(phase3Index).toBeGreaterThanOrEqual(0)
    expect(initIndex).toBeLessThan(phase3Index)
  })
})
