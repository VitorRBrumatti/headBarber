import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260801182418_subscription_booking_core.sql',
  ),
  'utf8',
)

describe('subscription-aware booking migration', () => {
  it('defines one shared writer and the three stable wrappers', () => {
    expect(migration).toMatch(
      /create or replace function private\.create_appointment_with_entitlements/i,
    )
    expect(migration).toMatch(
      /create or replace function public\.preview_public_booking_with_entitlements/i,
    )
    expect(migration).toMatch(
      /create or replace function public\.create_public_booking_with_entitlements/i,
    )
    expect(migration).toMatch(
      /create or replace function public\.create_admin_booking_with_entitlements/i,
    )
    expect(migration.match(/insert into public\.appointments/gi)).toHaveLength(1)
  })

  it('keeps preview read-only and derives the admin tenant from auth', () => {
    expect(migration).toMatch(/if not p_preview then[\s\S]+insert into public\.appointments/i)
    expect(migration).toMatch(
      /create or replace function public\.create_admin_booking_with_entitlements[\s\S]+public\.get_user_barbershop_id\(auth\.uid\(\)\)/i,
    )
  })
})
