import { test, expect } from '@playwright/test'
import { loginOwner, seedBookingFixture } from './barber-service-fixture'

test.describe('HeadBarber - Fluxo Alternativo (Fase 5 - Validações)', () => {
  test('deve validar limites de comissão e quantidade de estoque', async ({ page }) => {
    const fixture = await seedBookingFixture()
    await loginOwner(page, fixture)
    await expect(page).toHaveURL(/\/dashboard/)

    await page.goto('/dashboard/barbeiros')
    await page.click('button:has-text("Novo Barbeiro")')
    await page.fill('input[name="name"]', 'Barbeiro Limites')

    const commissionInput = page.locator('input[name="commission_percentage"]')
    await commissionInput.fill('120')
    expect(await commissionInput.evaluate((el: HTMLInputElement) => el.checkValidity() === false)).toBe(true)

    await commissionInput.fill('-10')
    expect(await commissionInput.evaluate((el: HTMLInputElement) => el.checkValidity() === false)).toBe(true)

    const uniqueBarberName = `Barbeiro Limites ${Date.now()}`
    await page.fill('input[name="name"]', uniqueBarberName)
    await commissionInput.fill('40')
    await page.click('button:has-text("Criar profissional")')
    await expect(page.locator(`h3:has-text("${uniqueBarberName}")`)).toBeVisible()

    const uniqueProductName = `Shampoo E2E ${Date.now()}`
    await page.goto('/dashboard/produtos')
    await page.click('button:has-text("Novo Produto")')
    await page.fill('input[name="name"]', uniqueProductName)
    await page.fill('input[name="sale_price"]', '80')
    await page.fill('input[name="stock_quantity"]', '1')
    await page.click('button:has-text("Criar produto")')

    const productCard = page.locator(`div.group:has(h3:has-text("${uniqueProductName}"))`).first()
    await expect(productCard).toBeVisible()
    await expect(productCard.getByText('1 un', { exact: true })).toBeVisible()
    await productCard.locator('button:has-text("Vender")').click()

    await expect(page.getByRole('button', { name: 'add', exact: true })).toBeDisabled()

    await page.getByRole('button', { name: /Registrar venda/ }).click()
    await expect(productCard.getByText('0 un', { exact: true })).toBeVisible()
    await expect(productCard.locator('button:has-text("Vender")')).toHaveCount(0)
  })
})
