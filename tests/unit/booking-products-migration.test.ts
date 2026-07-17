import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationName = readdirSync(join(process.cwd(), 'supabase', 'migrations'))
  .find((name) => name.endsWith('_booking_products_reservation.sql'))

const sql = migrationName
  ? readFileSync(join(process.cwd(), 'supabase', 'migrations', migrationName), 'utf8')
  : ''

describe('booking product reservations migration', () => {
  it('exists', () => {
    expect(migrationName).toBeDefined()
  })

  it('creates a protected reservation relation', () => {
    expect(sql).toMatch(/create table public\.appointment_products/i)
    expect(sql).toMatch(/enable row level security/i)
    expect(sql).toMatch(/quantity integer not null check \(quantity > 0\)/i)
    expect(sql).toMatch(/status text not null default 'reserved'/i)
    expect(sql).toMatch(/unique \(appointment_id, product_id\)/i)
    expect(sql).toMatch(/grant select on public\.appointment_products to authenticated/i)
    expect(sql).toMatch(/revoke all on public\.appointment_products from anon/i)
  })

  it('locks stock and exposes only the intended RPC', () => {
    expect(sql).toMatch(/for update/i)
    expect(sql).toMatch(
      /create or replace function public\.create_public_appointment_with_products/i,
    )
    expect(sql).toMatch(
      /revoke execute on function public\.create_public_appointment_with_products[\s\S]+from public/i,
    )
    expect(sql).toMatch(
      /grant execute on function public\.create_public_appointment_with_products[\s\S]+to anon, authenticated/i,
    )
  })

  it('restores reserved stock once on cancellation', () => {
    expect(sql).toMatch(/old\.status is distinct from 'cancelled'/i)
    expect(sql).toMatch(/new\.status = 'cancelled'/i)
    expect(sql).toMatch(
      /where appointment_id = new\.id[\s\S]+status = 'reserved'/i,
    )
    expect(sql).toMatch(/set status = 'released'/i)
    expect(sql).toMatch(/private\.release_cancelled_appointment_products/i)
  })

  it('allows anonymous users to list only active products', () => {
    expect(sql).toMatch(/on public\.products for select to anon/i)
    expect(sql).toMatch(/using \(is_active = true\)/i)
    expect(sql).toMatch(/grant select on public\.products to anon/i)
  })
})
