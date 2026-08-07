import { expect, test, type Page } from '@playwright/test'
import {
  executeLocalSql,
  loginOwner,
  seedBookingFixture,
  type BookingFixture,
} from './barber-service-fixture'

const clientName = 'Cliente Ciclo E2E'
const clientPhone = '11999990001'

function isoDateWithOffset(offset: number) {
  const date = new Date()
  date.setUTCHours(12, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

async function createPlan(page: Page, fixture: BookingFixture) {
  await page.goto('/dashboard/financeiro/assinaturas')
  await page.getByRole('button', { name: 'Novo plano' }).click()
  await page.locator('#plan-name').fill('Premium E2E')
  await page.locator('#plan-price').fill('149')
  await page.getByLabel(fixture.serviceName, { exact: true }).check()
  await page.getByLabel(`Limite de ${fixture.serviceName}`).fill('2')
  await page.getByRole('button', { name: 'Salvar plano' }).click()
  await expect(page.getByRole('heading', { name: 'Novo plano' })).toBeHidden()
  await page.reload()
  return executeLocalSql(`
    select id from public.subscription_plans
    where barbershop_id='${fixture.barbershopId}' and name='Premium E2E';
  `)
}

async function enrollClient(
  page: Page,
  fixture: BookingFixture,
  planId: string,
) {
  await page.getByRole('button', { name: 'Assinantes' }).click()
  await page.locator('#subscription-client').selectOption({ label: clientName })
  await page.locator('#subscription-plan').selectOption(planId)
  await page.locator('#subscription-start').fill(isoDateWithOffset(0))
  await page.getByRole('button', { name: 'Adicionar assinante' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Assinantes' }).click()
  await expect(page.getByRole('heading', { name: clientName })).toBeVisible()
  return executeLocalSql(`
    select id from public.client_subscriptions
    where barbershop_id='${fixture.barbershopId}'
      and client_id=(select id from public.clients
        where barbershop_id='${fixture.barbershopId}' and phone='${clientPhone}');
  `)
}

function createFutureAppointments(fixture: BookingFixture, productId: string) {
  return [5, 12, 20].map((daysAhead, index) => {
    const products =
      index === 0 ? `[{"productId":"${productId}","quantity":1}]` : '[]'
    const receipt = executeLocalSql(`
      begin;
      set local role anon;
      select public.create_public_booking_with_entitlements(
        '${fixture.barbershopId}', '${clientName}', '${clientPhone}', null,
        '${fixture.barberServiceIds[0]}', 1,
        '${isoDateWithOffset(daysAhead)} 10:00+00', null, '[]', '${products}'
      );
      commit;
    `)
    const jsonLine = receipt
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith('{'))
    if (!jsonLine) throw new Error('Booking RPC did not return a receipt')
    return {
      id: String(JSON.parse(jsonLine).appointmentId),
      date: isoDateWithOffset(daysAhead),
    }
  })
}

async function registerPayment(page: Page) {
  await page
    .getByLabel(`Forma de pagamento de ${clientName}`)
    .selectOption('pix')
  await page.getByRole('button', { name: 'Registrar pagamento' }).click()
  const confirmation = page
    .getByRole('heading', { name: 'Registrar pagamento' })
    .locator('..')
  await confirmation
    .getByRole('button', { name: 'Registrar pagamento' })
    .click()
  await expect(confirmation).toBeHidden()
}

function expectCoverage(
  appointmentIds: string[],
  expectedStatus: 'covered' | 'waiting',
) {
  const statuses = executeLocalSql(`
    select string_agg(subscription_coverage_status, ',' order by start_at)
    from public.appointments where id in (
      ${appointmentIds.map((id) => `'${id}'`).join(',')}
    );
  `)
  expect(statuses).toBe(
    Array.from({ length: appointmentIds.length }, () => expectedStatus).join(
      ',',
    ),
  )
}

async function settleFromAgenda(
  page: Page,
  appointment: { id: string; date: string },
  action: 'cancelado' | 'concluído',
) {
  await page.goto(`/dashboard/agenda?date=${appointment.date}`)
  await page
    .getByRole('button', {
      name: new RegExp(`Ver reserva de ${clientName}`),
    })
    .click()
  await page.getByRole('button', { name: `Marcar como ${action}` }).click()
  if (action === 'concluído') {
    await page.getByLabel('Forma de pagamento').selectOption('pix')
  }
  await page.getByRole('button', { name: 'Confirmar' }).click()
  const expectedStatus = action === 'cancelado' ? 'cancelled' : 'completed'
  await expect
    .poll(() =>
      executeLocalSql(
        `select status from public.appointments where id='${appointment.id}';`,
      ),
    )
    .toBe(expectedStatus)
}

test('subscription lifecycle avoids duplicate revenue and promotes released quota', async ({
  page,
}) => {
  const fixture = await seedBookingFixture()
  const clientId = crypto.randomUUID()
  const productId = crypto.randomUUID()
  const productName = `Pomada E2E ${crypto.randomUUID().slice(0, 6)}`

  executeLocalSql(`
    update public.barbershop_settings set
      client_subscriptions_admin_enabled=true,
      client_subscriptions_booking_enabled=true,
      client_subscriptions_settlement_enabled=true
    where barbershop_id='${fixture.barbershopId}';
    update public.barbers set commission_percentage=30
    where barbershop_id='${fixture.barbershopId}';
    delete from public.barber_work_hours
    where barbershop_id='${fixture.barbershopId}';
    insert into public.barber_work_hours(
      barbershop_id,barber_id,day_of_week,start_time,end_time,
      lunch_start_time,lunch_end_time
    )
    select '${fixture.barbershopId}',barber.id,day_of_week,
      '08:00','20:00','12:00','13:00'
    from public.barbers barber cross join generate_series(0,6) day_of_week
    where barber.barbershop_id='${fixture.barbershopId}';
    insert into public.clients(id,barbershop_id,name,phone)
    values('${clientId}','${fixture.barbershopId}','${clientName}','${clientPhone}');
    insert into public.products(
      id,barbershop_id,name,sale_price,stock_quantity,is_active
    ) values('${productId}','${fixture.barbershopId}','${productName}',25,5,true);
  `)

  try {
    await loginOwner(page, fixture)
    const planId = await createPlan(page, fixture)
    const subscriptionId = await enrollClient(page, fixture, planId)
    expect(subscriptionId).toBeTruthy()

    const [first, second, third] = createFutureAppointments(fixture, productId)
    await registerPayment(page)

    expectCoverage([first.id, second.id], 'covered')
    expectCoverage([third.id], 'waiting')

    await settleFromAgenda(page, second, 'cancelado')
    expectCoverage([first.id, third.id], 'covered')

    await settleFromAgenda(page, first, 'concluído')
    const revenueCounts = executeLocalSql(`
      select
        count(*) filter (where source='subscription_cycle') || ',' ||
        count(*) filter (where source='appointment_product') || ',' ||
        count(*) filter (where source='appointment_service')
      from public.revenues where barbershop_id='${fixture.barbershopId}';
    `)
    expect(revenueCounts).toBe('1,1,0')
    expect(
      executeLocalSql(`
        select count(*) from public.product_sales
        where appointment_id='${first.id}';
      `),
    ).toBe('1')
  } finally {
    executeLocalSql(`
      delete from public.barbershops where id='${fixture.barbershopId}';
      delete from auth.users where email='${fixture.ownerEmail}';
    `)
  }
})
