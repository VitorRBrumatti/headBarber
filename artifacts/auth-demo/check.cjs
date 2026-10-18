const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 940 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const route of ['login', 'demo']) {
      await page.goto(`http://127.0.0.1:3002/${route}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1000);
      const capture = async name => {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.equal(await page.getByText(/10\.000/).count(), 0);
        await page.screenshot({ path: `artifacts/auth-demo/${name}-${width}.png`, fullPage: true });
      };
      await capture(route);
      if (route === 'login') {
        const brand = page.getByRole('region', { name: 'HeadBarber', exact: true });
        const before = await brand.boundingBox();
        await page.locator('#btn-toggle-register').click();
        await page.waitForTimeout(950);
        if (width > 760) assert.ok((await brand.boundingBox()).x > before.x + 100);
        await capture('register');
        await page.locator('#btn-toggle-login').click();
        await page.waitForTimeout(950);
        assert.equal(await page.locator('#reg-email').count(), 0);
      }
    }
    assert.deepEqual(errors, []);
    console.log(`${width}: login/register/demo screenshots; slide, overflow and page errors passed`);
    await page.close();
  }
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:3002/login');
  await page.locator('#btn-toggle-register').click();
  assert.equal(await page.getByRole('region', { name: 'HeadBarber', exact: true }).evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.goto('http://127.0.0.1:3002/');
  const annual = page.locator('#precos article').last();
  assert.equal(await annual.evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert.notEqual(await annual.evaluate(el => getComputedStyle(el).animationName), 'none');
  console.log('Reduced motion respected; annual animation enabled only with normal motion');
  await browser.close();
})();
