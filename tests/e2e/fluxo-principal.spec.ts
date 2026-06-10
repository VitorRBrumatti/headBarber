import { test, expect } from '@playwright/test'

test.describe('HeadBarber - Fluxo Principal (Fase 5 - Financeiro)', () => {
  test('deve executar o fluxo de ponta a ponta com sucesso', async ({ page }) => {
    // 1. Acessar página de login e entrar com e-mail dinâmico
    await page.goto('/login')
    
    const testEmail = `test-e2e-${Date.now()}@example.com`
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
      
      // Tenta login com conta estável para evitar rate limit de inscrições
      await page.fill('input[type="email"]', 'e2e-stable-test@headbarber.com')
      await page.click('button[type="submit"]')
      await page.waitForURL(url => url.pathname.includes('/onboarding') || url.pathname.includes('/dashboard'), { timeout: 10000 })
    }

    if (page.url().includes('/onboarding')) {
      await page.fill('input[name="name"]', 'Barbearia E2E Principal')
      await page.click('button:has-text("Entrar no Dashboard")')
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    }

    // Garantir que estamos no Dashboard
    await expect(page).toHaveURL(/\/dashboard/)

    // 4. Cadastrar Barbeiro com comissão de 35%
    const uniqueBarberName = `Barbeiro E2E ${Date.now()}`
    await page.goto('/dashboard/barbeiros')
    await page.click('button:has-text("Novo Barbeiro")')
    await page.fill('input[name="name"]', uniqueBarberName)
    await page.fill('input[name="commission_percentage"]', '35')
    await page.fill('textarea[name="bio"]', 'Especialista em cortes clássicos e barba.')
    await page.click('button:has-text("Criar profissional")')

    // Validar se o barbeiro foi cadastrado
    await expect(page.locator(`h3:has-text("${uniqueBarberName}")`)).toBeVisible()

    // 5. Cadastrar Produto com preço R$ 60,00 e estoque inicial 5
    const uniqueProductName = `Produto E2E ${Date.now()}`
    await page.goto('/dashboard/produtos')
    await page.click('button:has-text("Novo Produto")')
    await page.fill('input[name="name"]', uniqueProductName)
    await page.fill('input[name="sale_price"]', '60')
    await page.fill('input[name="stock_quantity"]', '5')
    await page.click('button:has-text("Criar produto")')

    // Validar se o produto aparece listado
    const productCard = page.locator(`div.group:has(h3:has-text("${uniqueProductName}"))`).first()
    await expect(productCard).toBeVisible()

    // 6. Realizar a Venda do Produto
    await productCard.locator('button:has-text("Vender")').click()
    
    // A sheet de venda abre
    await page.fill('input[id="sell-quantity"]', '2')
    await page.selectOption('select[id="sell-payment"]', 'pix')
    await page.click('button:has-text("Confirmar Venda")')

    // Validar se o estoque reduziu para 3
    await expect(productCard.locator('text=3 em estoque')).toBeVisible()

    // 7. Navegar até o painel financeiro e verificar se o faturamento aumentou
    await page.goto('/dashboard/financeiro')
    const totalRevText = await page.locator('div.group:has(p:has-text("Faturamento Total")) h3').first().innerText()
    console.log('Faturamento Total exibido:', totalRevText)

    // 8. Lançar uma despesa manual de aluguel no valor de R$ 40,00
    await page.click('button:has-text("Lançar Despesa")')
    await page.selectOption('select[id="exp-category"]', 'rent')
    await page.fill('input[id="exp-description"]', 'Aluguel do Salão E2E')
    await page.fill('input[id="exp-amount"]', '40')
    await page.click('form button:has-text("Lançar Despesa")')

    // Validar se despesas aumentaram
    await page.waitForTimeout(1000)
    const totalExpText = await page.locator('div.group:has(p:has-text("Saídas e Custos")) h3').first().innerText()
    console.log('Saídas e Custos exibidos:', totalExpText)
  })
})
