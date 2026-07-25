import { expect, test } from '@playwright/test'
import {
  executeLocalSql,
  loginOwner,
  prepareBookingConfirmation,
  seedBookingFixture,
} from './barber-service-fixture'

test('preserva configuração por profissional e snapshots históricos', async ({
  page,
}) => {
  const fixture = await seedBookingFixture()
  const clientName = `Cliente Histórico ${Date.now()}`

  await prepareBookingConfirmation(
    page,
    fixture,
    clientName,
    '11988887777',
  )
  await expect(page.getByText(fixture.barberNames[1])).toBeVisible()
  await expect(page.getByText('45 min')).toBeVisible()
  await expect(page.getByText('R$ 50,00').first()).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar' }).click()

  await expect(
    page.getByRole('heading', { name: 'Agendamento confirmado' }),
  ).toBeVisible()
  await expect(page.getByText(fixture.barberNames[1])).toBeVisible()
  await expect(page.getByText('45 min')).toBeVisible()
  await expect(page.getByText('R$ 50,00').first()).toBeVisible()

  await loginOwner(page, fixture)
  await page.goto('/dashboard/reservas')
  await page.getByRole('button', { name: new RegExp(clientName) }).click()
  await expect(page.getByText('45 min')).toBeVisible()
  await expect(page.getByText('R$ 50,00').first()).toBeVisible()

  executeLocalSql(`
    update public.barber_services
    set price=80,duration_minutes=60
    where id='${fixture.barberServiceIds[1]}'
  `)

  await page.reload()
  await page.getByRole('button', { name: new RegExp(clientName) }).click()
  await expect(page.getByText('45 min')).toBeVisible()
  await expect(page.getByText('R$ 50,00').first()).toBeVisible()
})
