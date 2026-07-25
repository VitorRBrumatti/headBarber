import { expect, test, type Page } from '@playwright/test'
import {
  executeLocalSql,
  seedBookingFixture,
  type BookingFixture,
} from './barber-service-fixture'

async function chooseBarberAndService(
  page: Page,
  fixture: BookingFixture,
  barberIndex: 0 | 1,
) {
  await page.goto(`/booking/${fixture.slug}`)
  await page
    .getByRole('button', {
      name: new RegExp(fixture.barberNames[barberIndex]),
    })
    .click()
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page
    .getByRole('button', { name: new RegExp(fixture.serviceName) })
    .click()
  await page.getByRole('button', { name: /Avançar/ }).click()
}

async function finishBooking(
  page: Page,
  fixture: BookingFixture,
  clientName: string,
  phone: string,
) {
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page.getByRole('button', { name: /Continuar sem produtos/ }).click()
  await page.locator('main section button').nth(1).click()
  await page.getByRole('button', { name: '09:00', exact: true }).click()
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page.getByLabel(/Nome completo/).fill(clientName)
  await page.getByLabel(/Celular/).fill(phone)
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(
    page.getByRole('heading', { name: 'Agendamento confirmado' }),
  ).toBeVisible()
  await expect(page.getByText(fixture.addOnName)).toBeHidden()
}

test('usa preço e duração do adicional configurado para cada barbeiro', async ({
  page,
}) => {
  const fixture = await seedBookingFixture()

  await chooseBarberAndService(page, fixture, 0)
  const anaAddOn = page
    .getByRole('button', { name: new RegExp(fixture.addOnName) })
  await expect(anaAddOn).toContainText('R$ 10,00')
  await expect(anaAddOn).toContainText('15 min')
  await anaAddOn.click()
  await finishBooking(page, fixture, `Cliente Ana ${Date.now()}`, '11970000001')
  await expect(page.getByText('45 min')).toBeVisible()
  await expect(page.getByText('R$ 50,00').first()).toBeVisible()

  await chooseBarberAndService(page, fixture, 1)
  const biaAddOn = page
    .getByRole('button', { name: new RegExp(fixture.addOnName) })
  await expect(biaAddOn).toContainText('R$ 20,00')
  await expect(biaAddOn).toContainText('10 min')
  await biaAddOn.click()
  await finishBooking(page, fixture, `Cliente Bia ${Date.now()}`, '11970000002')
  await expect(page.getByText('55 min')).toBeVisible()
  await expect(page.getByText('R$ 70,00').first()).toBeVisible()
})

test('trocar o barbeiro limpa o adicional selecionado', async ({ page }) => {
  const fixture = await seedBookingFixture()

  await chooseBarberAndService(page, fixture, 0)
  const anaAddOn = page
    .getByRole('button', { name: new RegExp(fixture.addOnName) })
  await anaAddOn.click()
  await expect(anaAddOn).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /Voltar/ }).click()
  await page.getByRole('button', { name: /Voltar/ }).click()
  await page
    .getByRole('button', { name: new RegExp(fixture.barberNames[1]) })
    .click()
  await page.getByRole('button', { name: /Avançar/ }).click()
  await page
    .getByRole('button', { name: new RegExp(fixture.serviceName) })
    .click()
  await page.getByRole('button', { name: /Avançar/ }).click()

  const biaAddOn = page
    .getByRole('button', { name: new RegExp(fixture.addOnName) })
  await expect(biaAddOn).toContainText('R$ 20,00')
  await expect(biaAddOn).toHaveAttribute('aria-pressed', 'false')
})

test('configuração desatualizada volta aos adicionais e recarrega valores', async ({
  page,
}) => {
  const fixture = await seedBookingFixture()

  await chooseBarberAndService(page, fixture, 0)
  const addOn = page
    .getByRole('button', { name: new RegExp(fixture.addOnName) })
  await addOn.click()

  executeLocalSql(`
    update public.barber_add_ons
    set price=11
    where id='${fixture.barberAddOnIds[0]}'
  `)

  await page.getByRole('button', { name: /Avançar/ }).click()
  await page.getByRole('button', { name: /Continuar sem produtos/ }).click()
  await page.locator('main section button').nth(1).click()

  await expect(
    page.getByRole('heading', { name: /complementar o serviço/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: new RegExp(fixture.addOnName) }),
  ).toContainText('R$ 11,00')
})
