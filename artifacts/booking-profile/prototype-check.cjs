const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:3002/booking/headbarber-demo');
    const nav = page.getByRole('navigation', { name: 'Etapas do agendamento' });
    assert.ok((await nav.innerText()).includes('Escolha seu barbeiro'));
    assert.equal(await page.getByRole('progressbar').locator('span').count(), 7);
    const maps = page.getByRole('link', { name: /Abrir no Google Maps/ });
    assert.ok((await maps.getAttribute('href')).startsWith('https://www.google.com/maps/search/'));
    await page.getByRole('button', { name: /Lucas Rocha/ }).click();
    await page.evaluate(() => Promise.all([...document.querySelectorAll('main img')].map(image => image.decode())));
    assert.equal(await page.locator('main img').count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `artifacts/booking-profile/prototype-step1-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByRole('button', { name: /Corte tradicional/ }).waitFor();
    await page.getByRole('button', { name: 'Retornar à etapa anterior' }).click();
    assert.equal(await page.getByRole('button', { name: /Lucas Rocha/ }).getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    console.log(`${width}: banner/avatar/staff photos loaded; Maps, segmented header, back navigation, selection and overflow passed`);
    await page.close();
  }
  await browser.close();
})().catch(error => { console.error(error.message); process.exit(1); });
