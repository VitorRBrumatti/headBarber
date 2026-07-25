import { test, expect } from '@playwright/test'
import { loginOwner, seedBookingFixture } from './barber-service-fixture'

test.describe('HeadBarber - Fluxo Principal (Fase 5 - Financeiro)', () => {
  test('deve executar o fluxo de ponta a ponta com sucesso', async ({ page }) => {
    const fixture = await seedBookingFixture()
    await loginOwner(page, fixture)
    await expect(page).toHaveURL(/\/dashboard/)

    const uniqueBarberName = `Barbeiro E2E ${Date.now()}`
    await page.goto('/dashboard/barbeiros')
    await page.click('button:has-text("Novo Barbeiro")')
    await page.fill('input[name="name"]', uniqueBarberName)
    await page.fill('input[name="commission_percentage"]', '35')
    await page.fill('textarea[name="bio"]', 'Especialista em cortes clássicos e barba.')
    await page.click('button:has-text("Criar profissional")')
    await expect(page.locator(`h3:has-text("${uniqueBarberName}")`)).toBeVisible()

    const uniqueProductName = `Produto E2E ${Date.now()}`
    await page.goto('/dashboard/produtos')
    await page.click('button:has-text("Novo Produto")')
    await page.fill('input[name="name"]', uniqueProductName)
    await page.fill('input[name="sale_price"]', '60')
    await page.fill('input[name="stock_quantity"]', '5')
    await page.click('button:has-text("Criar produto")')

    const productCard = page.locator(`div.group:has(h3:has-text("${uniqueProductName}"))`).first()
    await expect(productCard).toBeVisible()
    await productCard.locator('button:has-text("Vender")').click()

    await page.getByRole('button', { name: 'add', exact: true }).click()
    await page.getByRole('radio', { name: /Pix/ }).check()
    await page.getByRole('button', { name: /Registrar venda/ }).click()
    await expect(productCard.getByText('3 un', { exact: true })).toBeVisible()

    await page.goto('/dashboard/financeiro')
    const totalRevText = await page.getByTestId('metric-total-revenues').innerText()
    console.log('Faturamento Total exibido:', totalRevText)

    await page.getByRole('button', { name: 'Novo Lançamento' }).click()
    const entryDrawer = page.getByRole('dialog', { name: 'Novo Lançamento' })
    await expect(entryDrawer).toBeVisible()
    await expect(entryDrawer.getByRole('button', { name: 'Receita' })).toHaveAttribute('aria-pressed', 'true')
    await expect(entryDrawer.getByLabel('Forma de pagamento')).toBeVisible()
    await expect(entryDrawer.getByLabel('Despesa recorrente')).toHaveCount(0)

    await entryDrawer.getByRole('button', { name: 'Despesa' }).click()
    await expect(entryDrawer.getByRole('button', { name: 'Despesa' })).toHaveAttribute('aria-pressed', 'true')
    await expect(entryDrawer.getByLabel('Forma de pagamento')).toHaveCount(0)
    await expect(entryDrawer.getByLabel('Despesa recorrente')).toBeVisible()

    await entryDrawer.getByLabel('Categoria').selectOption('rent')
    await entryDrawer.getByLabel('Descrição').fill('Aluguel do Salão E2E')
    await entryDrawer.getByLabel('Valor').fill('40')
    await entryDrawer.getByRole('button', { name: 'Salvar Lançamento' }).click()

    await expect(entryDrawer).toBeHidden()
    const totalExpText = await page.getByTestId('metric-total-expenses').innerText()
    console.log('Saídas e Custos exibidos:', totalExpText)

    await page.getByRole('button', { name: 'Novo Lançamento' }).click()
    await expect(entryDrawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(entryDrawer).toBeHidden()
  })
})
