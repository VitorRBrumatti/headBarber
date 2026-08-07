import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDirectory = join(process.cwd(), 'supabase', 'migrations')
const migrationName = readdirSync(migrationsDirectory).find((name) =>
  name.endsWith('_client_subscriptions_default_enabled.sql'),
)

describe('client subscription automatic activation migration', () => {
  it('backfills settings rows and enables every existing barbershop', () => {
    expect(migrationName).toBeDefined()
    const path = join(migrationsDirectory, migrationName!)
    expect(existsSync(path)).toBe(true)
    const sql = readFileSync(path, 'utf8')

    expect(sql).toMatch(/insert into public\.barbershop_settings\s*\(barbershop_id\)/i)
    expect(sql).toMatch(/select barbershop\.id[\s\S]+from public\.barbershops/i)
    expect(sql).toMatch(/on conflict \(barbershop_id\) do nothing/i)
    expect(sql).toMatch(/update public\.barbershop_settings[\s\S]+client_subscriptions_admin_enabled\s*=\s*true/i)
    expect(sql).toMatch(/client_subscriptions_booking_enabled\s*=\s*true/i)
    expect(sql).toMatch(/client_subscriptions_settlement_enabled\s*=\s*true/i)
  })

  it('enables all three flags by default for future rows', () => {
    expect(migrationName).toBeDefined()
    const sql = readFileSync(join(migrationsDirectory, migrationName!), 'utf8')

    for (const column of [
      'client_subscriptions_admin_enabled',
      'client_subscriptions_booking_enabled',
      'client_subscriptions_settlement_enabled',
    ]) {
      expect(sql).toMatch(
        new RegExp(`alter column ${column} set default true`, 'i'),
      )
    }
  })
})
