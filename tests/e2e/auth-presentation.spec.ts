import { test, expect } from '@playwright/test'
import { loginOwner, seedBookingFixture } from './barber-service-fixture'

test('auth redesign preserves local password login', async ({ page }) => {
  const fixture = await seedBookingFixture()
  await loginOwner(page, fixture)
  await expect(page).toHaveURL(/\/dashboard/)
})

test('switching forms preserves fields and registration validation', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#login-email').fill('visual-test@example.com')
  await page.locator('#btn-toggle-register').click()
  await expect(page.getByRole('heading', { name: 'Crie sua conta' })).toBeVisible()
  await expect(page.locator('#reg-email')).toHaveValue('visual-test@example.com')
  await expect(page.locator('#login-email')).toHaveCount(0)
  await page.locator('#reg-name').fill('Teste visual')
  await page.locator('#reg-password').fill('short')
  await page.locator('#reg-confirm').fill('short')
  const submit = page.locator('form').getByRole('button', { name: 'Criar conta', exact: true })
  await submit.click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('pelo menos 8 caracteres')
  await page.locator('#reg-password').fill('valid-password')
  await page.locator('#reg-confirm').fill('different-password')
  await submit.click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('não coincidem')
  await page.locator('#reg-confirm').fill('valid-password')
  await submit.click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('aceitar os Termos')
  await page.route('**/auth/v1/signup*', route => {
    expect(route.request().postDataJSON()).toMatchObject({
      email: 'visual-test@example.com', password: 'valid-password',
      data: { full_name: 'Teste visual' },
    })
    return route.fulfill({ json: { user: { id: 'presentation-test', identities: [{ id: 'email' }] }, session: null } })
  })
  await page.locator('#terms').check()
  await submit.click()
  await expect(page.getByRole('status')).toContainText('Conta criada com sucesso')
  await page.locator('#btn-toggle-login').click()
  await expect(page.getByRole('heading', { name: 'Acesse sua conta' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('login errors, magic link and demo entry controls remain available', async ({ page }) => {
  await page.goto('/login?error=InvalidToken')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('expirou')
  await page.getByRole('button', { name: 'Receber link de acesso por e-mail' }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Informe seu e-mail')
  await page.locator('#login-email').fill('visual-test@example.com')
  await page.route('**/auth/v1/otp*', route => {
    expect(route.request().postDataJSON().email).toBe('visual-test@example.com')
    return route.fulfill({ json: {} })
  })
  await page.getByRole('button', { name: 'Receber link de acesso por e-mail' }).click()
  await expect(page.getByRole('status')).toContainText('link de acesso foi enviado')
  await page.route('**/auth/v1/token*', route => route.fulfill({
    status: 400, json: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
  }))
  await page.locator('#login-password').fill('wrong-password')
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('E-mail ou senha incorretos')
  await expect(page.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/forgot-password')
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeEnabled()
  await page.goto('/demo?error=unavailable')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('indisponível')
  await expect(page.getByRole('link', { name: 'Testar agendamento' })).toHaveAttribute('href', /\/booking\//)
  await expect(page.locator('form')).toHaveAttribute('action', '/auth/demo')
  await expect(page.locator('form')).toHaveAttribute('method', 'post')
})
