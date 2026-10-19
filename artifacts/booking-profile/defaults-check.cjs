const { chromium } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const { slug } = JSON.parse(readFileSync('artifacts/booking-profile/test-shop.json', 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.route('https://i.ibb.co/**', route => route.fulfill({ status: 404, body: '' }));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`http://localhost:3002/booking/${slug}`);
    await page.getByRole('img', { name: 'Imagem padrão da barbearia' }).evaluate(image => image.decode());
    assert.equal(await page.getByRole('img', { name: /Iniciais de/ }).innerText(), 'BE');
    assert.equal(await page.getByRole('link', { name: /Abrir no Google Maps/ }).count(), 0);
    const first = await page.getByRole('button', { name: 'Continuar', exact: true }).evaluate(el => ({ radius: getComputedStyle(el).borderRadius, background: getComputedStyle(el).backgroundImage }));
    await page.screenshot({ path: `artifacts/booking-profile/defaults-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: /Ana 30/ }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: /Corte E2E/ }).waitFor();
    const next = await page.getByRole('button', { name: 'Avançar', exact: true }).evaluate(el => ({ radius: getComputedStyle(el).borderRadius, background: getComputedStyle(el).backgroundImage }));
    assert.deepEqual(next, first);
    assert.equal(await page.getByRole('button', { name: 'Voltar', exact: true }).evaluate(el => getComputedStyle(el).borderRadius), first.radius);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `artifacts/booking-profile/rounded-buttons-${width}.png`, fullPage: true });
  }
  await page.goto('http://localhost:3002/login');
  await page.locator('#login-email').fill(`owner-${slug.slice(4)}@test.local`);
  await page.locator('#login-password').fill('HeadBarber-E2E-123!');
  await page.locator('form').getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.goto('http://localhost:3002/onboarding/profile');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `artifacts/booking-profile/initial-profile-${width}.png`, fullPage: true });
  }
  console.log('Fallback image, golden initials, hidden address, matching button styles and responsive setup verified');
  await browser.close();
})().catch(error => { console.error(error.message); process.exit(1); });
