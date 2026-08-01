import { expect, test } from '@playwright/test'
import {
  executeLocalSql,
  prepareBookingConfirmation,
  seedBookingFixture,
} from './barber-service-fixture'

test('aplica a assinatura na prévia e confirma novamente no servidor', async ({
  page,
}) => {
  const fixture = await seedBookingFixture()
  const clientId = crypto.randomUUID()
  const planId = crypto.randomUUID()
  const subscriptionId = crypto.randomUUID()
  const cycleId = crypto.randomUUID()
  const entitlementId = crypto.randomUUID()
  const phone = '11945550123'
  const periodStart = fixture.date.slice(0, 8) + '01'
  const periodEnd = new Date(`${periodStart}T12:00:00Z`)
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1)
  const periodEndDate = periodEnd.toISOString().slice(0, 10)

  executeLocalSql(`
    update public.barbershop_settings
    set client_subscriptions_booking_enabled=true
    where barbershop_id='${fixture.barbershopId}';
    insert into public.clients(id,barbershop_id,name,phone)
    values('${clientId}','${fixture.barbershopId}','Cliente Assinante','${phone}');
    insert into public.subscription_plans(id,barbershop_id,name,monthly_price)
    values('${planId}','${fixture.barbershopId}','Premium',100);
    insert into public.client_subscriptions(
      id,barbershop_id,client_id,plan_id,status,started_on,next_billing_date
    ) values(
      '${subscriptionId}','${fixture.barbershopId}','${clientId}','${planId}',
      'active','${periodStart}','${periodEndDate}'
    );
    insert into public.subscription_cycles(
      id,barbershop_id,client_subscription_id,period_start,period_end,status,
      plan_id_snapshot,plan_name_snapshot,price_snapshot,payment_method,paid_at
    ) values(
      '${cycleId}','${fixture.barbershopId}','${subscriptionId}',
      '${periodStart}','${periodEndDate}','paid','${planId}','Premium',100,
      'pix',timezone('utc',now())
    );
    insert into public.subscription_cycle_entitlements(
      id,barbershop_id,cycle_id,item_type,service_id,item_name_snapshot,
      monthly_limit
    ) values(
      '${entitlementId}','${fixture.barbershopId}','${cycleId}','service',
      '${fixture.serviceId}','${fixture.serviceName}',2
    );
  `)

  await prepareBookingConfirmation(page, fixture, 'Cliente Assinante', phone)

  await expect(page.getByText('Assinatura Premium')).toBeVisible()
  await expect(page.getByText('Coberto', { exact: true })).toBeVisible()
  await expect(page.getByText('A pagar', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(
    page.getByRole('heading', { name: 'Agendamento confirmado' }),
  ).toBeVisible()
  await expect(page.getByText('Coberto pela assinatura').first()).toBeVisible()
  await expect(page.getByText('A pagar pelo atendimento')).toBeVisible()
  await expect(page.getByText('R$ 0,00').first()).toBeVisible()
})
