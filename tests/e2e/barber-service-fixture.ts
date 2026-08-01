import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

function localEnvironment() {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const output = execFileSync(executable, ['supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .filter((line) => line.includes('='))
      .map((line) => {
        const [name, ...value] = line.split('=')
        return [name, value.join('=').replace(/^"|"$/g, '')]
      }),
  )
}

const environment = localEnvironment()

const authAdmin = createClient(
  environment.API_URL,
  environment.SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export function executeLocalSql(sql: string) {
  const config = readFileSync(
    join(process.cwd(), 'supabase', 'config.toml'),
    'utf8',
  )
  const projectName =
    config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1] ?? 'headbarber'

  return execFileSync(
    'docker',
    [
      'exec',
      `supabase_db_${projectName}`,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-Atc',
      sql,
    ],
    { encoding: 'utf8' },
  ).trim()
}

export interface BookingFixture {
  barbershopId: string
  slug: string
  date: string
  ownerEmail: string
  ownerPassword: string
  serviceId: string
  barberServiceIds: [string, string]
  barberNames: [string, string]
  barberAddOnIds: [string, string]
  serviceName: string
  addOnName: string
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function seedBookingFixture(): Promise<BookingFixture> {
  const suffix = crypto.randomUUID().slice(0, 8)
  const barbershopId = crypto.randomUUID()
  const serviceId = crypto.randomUUID()
  const barberIds: [string, string] = [crypto.randomUUID(), crypto.randomUUID()]
  const barberServiceIds: [string, string] = [
    crypto.randomUUID(),
    crypto.randomUUID(),
  ]
  const addOnId = crypto.randomUUID()
  const barberAddOnIds: [string, string] = [
    crypto.randomUUID(),
    crypto.randomUUID(),
  ]
  const date = new Date()
  date.setUTCHours(12, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + 1)
  const bookingDate = isoDate(date)
  const dayOfWeek = date.getUTCDay()
  const slug = `e2e-${suffix}`
  const ownerEmail = `owner-${suffix}@test.local`
  const ownerPassword = 'HeadBarber-E2E-123!'
  const barberNames: [string, string] = [`Ana 30 ${suffix}`, `Bia 45 ${suffix}`]
  const serviceName = `Corte E2E ${suffix}`
  const addOnName = `Sobrancelha E2E ${suffix}`

  const { data: owner, error: ownerError } =
    await authAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    })
  if (ownerError || !owner.user) throw ownerError

  executeLocalSql(`
    insert into public.barbershops(id,name,slug)
    values('${barbershopId}','Barbearia E2E ${suffix}','${slug}');
    insert into public.subscriptions(user_id,status)
    values('${owner.user.id}','active');
    update public.profiles
    set barbershop_id='${barbershopId}',role='owner'
    where id='${owner.user.id}';
    insert into public.barbers(id,barbershop_id,name) values
      ('${barberIds[0]}','${barbershopId}','${barberNames[0]}'),
      ('${barberIds[1]}','${barbershopId}','${barberNames[1]}');
    insert into public.services(
      id,barbershop_id,name,price,duration_minutes
    ) values(
      '${serviceId}','${barbershopId}','${serviceName}',40,30
    );
    insert into public.barber_services(
      id,barbershop_id,barber_id,service_id,price,duration_minutes
    ) values
      (
        '${barberServiceIds[0]}','${barbershopId}','${barberIds[0]}',
        '${serviceId}',40,30
      ),
      (
        '${barberServiceIds[1]}','${barbershopId}','${barberIds[1]}',
        '${serviceId}',50,45
      );
    insert into public.add_ons(
      id,barbershop_id,name,price,duration_minutes
    ) values(
      '${addOnId}','${barbershopId}','${addOnName}',10,15
    );
    insert into public.barber_add_ons(
      id,barbershop_id,barber_id,add_on_id,price,duration_minutes
    ) values
      (
        '${barberAddOnIds[0]}','${barbershopId}','${barberIds[0]}',
        '${addOnId}',10,15
      ),
      (
        '${barberAddOnIds[1]}','${barbershopId}','${barberIds[1]}',
        '${addOnId}',20,10
      );
    insert into public.barbershop_settings(
      barbershop_id,slot_interval_minutes
    ) values('${barbershopId}',15);
    insert into public.barber_work_hours(
      barbershop_id,barber_id,day_of_week,start_time,end_time,
      lunch_start_time,lunch_end_time
    ) values
      (
        '${barbershopId}','${barberIds[0]}',${dayOfWeek},'09:00','13:00',
        '11:30','12:00'
      ),
      (
        '${barbershopId}','${barberIds[1]}',${dayOfWeek},'09:00','13:00',
        '11:30','12:00'
      );
  `)

  return {
    barbershopId,
    slug,
    date: bookingDate,
    ownerEmail,
    ownerPassword,
    serviceId,
    barberServiceIds,
    barberNames,
    barberAddOnIds,
    serviceName,
    addOnName,
  }
}

export async function prepareBookingConfirmation(
  page: Page,
  fixture: BookingFixture,
  clientName: string,
  phone: string,
) {
  await page.goto(`/booking/${fixture.slug}`)
  await page
    .getByRole('button', { name: new RegExp(fixture.barberNames[1]) })
    .click()
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page
    .getByRole('button', { name: new RegExp(fixture.serviceName) })
    .click()
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page.getByRole('button', { name: /Continuar sem produtos/ }).click()
  await page.locator('main section button').nth(1).click()
  await page.getByRole('button', { name: '09:00', exact: true }).click()
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page.getByLabel(/Nome completo/).fill(clientName)
  await page.getByLabel(/Celular/).fill(phone)
  await page.getByRole('button', { name: /Avançar/ }).click()
}

export async function loginOwner(page: Page, fixture: BookingFixture) {
  await page.goto('/login')
  await page.locator('#login-email').fill(fixture.ownerEmail)
  await page.locator('#login-password').fill(fixture.ownerPassword)
  await page
    .locator('form')
    .filter({ has: page.locator('#login-email') })
    .getByRole('button', { name: 'Entrar', exact: true })
    .click()
  await page.waitForURL(/\/dashboard/)
}
