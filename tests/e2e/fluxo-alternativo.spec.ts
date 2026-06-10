import { test, expect } from '@playwright/test'

test.describe('HeadBarber - Fluxo Alternativo (Fase 5 - Validações)', () => {
  test('deve validar limites de comissão e quantidade de estoque', async ({ page }) => {
    // 1. Login e Onboarding
    await page.goto('/login')
    
    const testEmail = `test-e2e-alt-${Date.now()}@example.com`
    await page.fill('input[type="email"]', testEmail)
    await page.click('button[type="submit"]')
    
    // Race redirect vs error alert
    await Promise.race([
      page.waitForURL(url => url.pathname.includes('/onboarding') || url.pathname.includes('/dashboard'), { timeout: 8000 }),
      page.waitForSelector('.bg-red-500\\/10, [role="alert"], div.text-red-500', { state: 'visible', timeout: 8000 }).catch(() => 'no-error')
    ])
    
    if (page.url().includes('/login')) {
      const errorText = await page.locator('.bg-red-500\\/10, [role="alert"], div.text-red-500').first().innerText().catch(() => '')
      console.log('Registro falhou:', errorText, '- Usando conta estável de teste')
      
      await page.fill('input[type="email"]', 'e2e-stable-test@headbarber.com')
      await page.click('button[type="submit"]')
      await page.waitForURL(url => url.pathname.includes('/onboarding') || url.pathname.includes('/dashboard'), { timeout: 10000 })
    }

    if (page.url().includes('/onboarding')) {
      await page.fill('input[name="name"]', 'Barbearia E2E Alternativa')
      await page.click('button:has-text("Entrar no Dashboard")')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    }

    await expect(page).toHaveURL(/\/dashboard/)

    // 2. Tentar cadastrar barbeiro com comissão inválida (fora do limite 0-100)
    await page.goto('/dashboard/barbeiros')
    await page.click('button:has-text("Novo Barbeiro")')
    await page.fill('input[name="name"]', 'Barbeiro Limites')
    
    const commissionInput = page.locator('input[name="commission_percentage"]')
    await commissionInput.fill('120') // Acima do máximo de 100%
    
    const isInvalidMax = await commissionInput.evaluate((el: HTMLInputElement) => el.checkValidity() === false)
    expect(isInvalidMax).toBe(true)

    await commissionInput.fill('-10') // Abaixo do mínimo de 0%
    const isInvalidMin = await commissionInput.evaluate((el: HTMLInputElement) => el.checkValidity() === false)
    expect(isInvalidMin).toBe(true)

    // Ajusta para valor correto e cadastra
    const uniqueBarberName = `Barbeiro Limites ${Date.now()}`
    await page.fill('input[name="name"]', uniqueBarberName)
    await commissionInput.fill('40')
    await page.click('button:has-text("Criar profissional")')
    await expect(page.locator(`h3:has-text("${uniqueBarberName}")`)).toBeVisible()

    // 3. Cadastrar Produto com estoque limitado (1 un)
    const uniqueProductName = `Shampoo E2E ${Date.now()}`
    await page.goto('/dashboard/produtos')
    await page.click('button:has-text("Novo Produto")')
    await page.fill('input[name="name"]', uniqueProductName)
    await page.fill('input[name="sale_price"]', '80')
    await page.fill('input[name="stock_quantity"]', '1')
    await page.click('button:has-text("Criar produto")')

    const productCard = page.locator(`div.group:has(h3:has-text("${uniqueProductName}"))`).first()
    await expect(productCard).toBeVisible()
    await expect(productCard.locator('text=1 em estoque')).toBeVisible()

    // 4. Tentar vender quantidade superior ao estoque (ex: 2 un)
    await productCard.locator('button:has-text("Vender")').click()
    
    const quantityInput = page.locator('input[id="sell-quantity"]')
    await quantityInput.fill('2')

    // Since onChange clamps the value back to 1, it should be auto-corrected to '1'
    const value = await quantityInput.inputValue()
    expect(value).toBe('1')

    // Confirma a venda de 1 un
    await page.click('button:has-text("Confirmar Venda")')

    // Valida que o estoque zerou
    await expect(productCard.locator('text=0 em estoque')).toBeVisible()
    
    // Valida que o botão Vender agora está desabilitado (estoque zerado)
    const sellButton = productCard.locator('button:has-text("Vender")')
    await expect(sellButton).toBeDisabled()
  })
})
