import { expect, test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { seedBookingFixture } from './barber-service-fixture'

for (const width of [1440, 768, 390]) {
  test(`visual public booking preserves seven steps and receipt at ${width}px`, async ({ page }) => {
    const fixture = await seedBookingFixture()
    const directory = 'artifacts/design-overhaul'
    mkdirSync(directory, { recursive: true })
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/booking/${fixture.slug}`)
    await expect(page.getByRole('navigation', { name: 'Etapas do agendamento' })).toContainText('Escolha seu barbeiro')
    await expect(page.getByRole('progressbar').locator('span')).toHaveCount(7)
    await expect(page.getByRole('button', { name: /Sair do agendamento/ })).toBeVisible()
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
    const capture = async (step: number | string) => {
      if (typeof step === 'number') await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(step))
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `${directory}/booking-step-${step}-${width}.png`, fullPage: true })
    }
    await capture(1)
    await page.getByRole('button', { name: new RegExp(fixture.barberNames[1]) }).click()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
    await page.getByRole('button', { name: new RegExp(fixture.serviceName) }).waitFor()
    await capture(2)
    await page.getByRole('button', { name: new RegExp(fixture.serviceName) }).click()
    await page.getByRole('button', { name: /Avançar/ }).click()
    await capture(3)
    await page.getByRole('button', { name: /Avançar/ }).click()
    await capture(4)
    await page.getByRole('button', { name: /Continuar sem produtos/ }).click()
    await capture(5)
    await page.locator('main section button').nth(1).click()
    await page.getByRole('button', { name: '09:00', exact: true }).click()
    await page.getByRole('button', { name: /Avançar/ }).click()
    await capture(6)
    await page.getByLabel(/Nome completo/).fill(`Visual QA ${width}`)
    await page.getByLabel(/Celular/).fill('11988887777')
    await page.getByRole('button', { name: /Avançar/ }).click()
    await capture(7)
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Agendamento confirmado' })).toBeVisible()
    await expect(page.getByText(fixture.barberNames[1])).toBeVisible()
    await expect(page.getByText('45 min')).toBeVisible()
    await expect(page.getByText('R$ 50,00').first()).toBeVisible()
    await capture('success')
  })
}
