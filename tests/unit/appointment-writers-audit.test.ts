import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const repositoryMatches = execFileSync(
  'rg',
  [
    '-n',
    '-i',
    "from\\('appointments'\\)|insert into public\\.appointments|update public\\.appointments",
    'src',
    'supabase/migrations',
  ],
  { encoding: 'utf8' },
)

const appointmentSourceFiles = execFileSync(
  'rg',
  ['-l', "from\\('appointments'\\)", 'src'],
  { encoding: 'utf8' },
)
  .trim()
  .split(/\r?\n/)

const applicationUpdateInventory = appointmentSourceFiles
  .flatMap((file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8')
    return [
      ...source.matchAll(
        /\.from\('appointments'\)[\s\S]{0,160}?\.update\(([^)]+)\)/g,
      ),
    ].map(
      (match) => `${file.replaceAll('\\', '/')}:${match[1]}`,
    )
  })
  .sort()
const publicBookingActions = readFileSync(
  join(process.cwd(), 'src', 'app', 'booking', '[slug]', 'actions.ts'),
  'utf8',
)

const agendaActions = readFileSync(
  join(process.cwd(), 'src', 'app', 'dashboard', 'agenda', 'actions.ts'),
  'utf8',
)

const scheduleMigration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20240522_phase4_booking_schedule.sql',
  ),
  'utf8',
)

const rpcExpandMigration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260723001610_barber_service_rpc_expand.sql',
  ),
  'utf8',
)

const productReservationMigration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260717025918_booking_products_reservation.sql',
  ),
  'utf8',
)

const barberAddOnConfirmationMigration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260725211743_barber_add_on_confirmation_expand.sql',
  ),
  'utf8',
)

const subscriptionBookingMigration = readFileSync(
  join(
    process.cwd(),
    'supabase',
    'migrations',
    '20260801182418_subscription_booking_core.sql',
  ),
  'utf8',
)

describe('appointment writer inventory', () => {
  it('keeps appointment creation inside the reviewed booking RPC paths', () => {
    const appointmentInsertMatches = repositoryMatches
      .split(/\r?\n/)
      .filter((line) => /insert into public\.appointments/i.test(line))

    expect(appointmentInsertMatches).toHaveLength(4)
    expect(appointmentInsertMatches).toEqual(
      expect.arrayContaining([
        expect.stringContaining('20240522_phase4_booking_schedule.sql'),
        expect.stringContaining('20260723001610_barber_service_rpc_expand.sql'),
        expect.stringContaining(
          '20260725211743_barber_add_on_confirmation_expand.sql',
        ),
        expect.stringContaining('20260801182418_subscription_booking_core.sql'),
      ]),
    )
    expect(scheduleMigration).toMatch(
      /create or replace function public\.create_public_appointment_with_client[\s\S]+insert into public\.appointments/i,
    )
    expect(productReservationMigration).toMatch(
      /create or replace function public\.create_public_appointment_with_products[\s\S]+public\.create_public_appointment_with_client/i,
    )
    expect(rpcExpandMigration).toMatch(
      /create or replace function private\.create_appointment_from_barber_service[\s\S]+insert into public\.appointments/i,
    )
    expect(rpcExpandMigration).toMatch(
      /create trigger guard_appointment_interval[\s\S]+private\.guard_appointment_interval/i,
    )
    expect(barberAddOnConfirmationMigration).toMatch(
      /create or replace function public\.create_public_booking_with_barber_add_ons[\s\S]+insert into public\.appointments/i,
    )
    expect(subscriptionBookingMigration).toMatch(
      /create or replace function private\.create_appointment_with_entitlements[\s\S]+insert into public\.appointments/i,
    )
    expect(publicBookingActions).not.toMatch(
      /\.from\('appointments'\)[\s\S]{0,160}\.(?:insert|upsert)\(/,
    )
    expect(agendaActions).not.toMatch(
      /\.from\('appointments'\)[\s\S]{0,160}\.(?:insert|upsert)\(/,
    )
  })

  it('allows only reviewed status or notification updates in application code', () => {
    expect(applicationUpdateInventory).toEqual([
      "src/app/booking/[slug]/actions.ts:{ whatsapp_confirmation_sent: true }",
      "src/app/dashboard/agenda/actions.ts:{ status }",
      "src/app/dashboard/agenda/actions.ts:{ whatsapp_confirmation_sent: true }",
    ])
  })

  it('has no direct agenda update for appointment identity or interval fields', () => {
    expect(agendaActions).not.toMatch(
      /\.update\(\{[^}]*(?:start_at|end_at|barber_id|service_id)[^}]*\}\)/,
    )
  })
})
