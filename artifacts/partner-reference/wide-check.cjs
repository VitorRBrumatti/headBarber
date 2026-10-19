const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('region', { name: 'Parceiro oficial', exact: true }).locator('img').evaluate(async image => {
    image.removeAttribute('srcset');
    image.loading = 'eager';
    image.src = '/brand/partners/hoffmanns-facade-ai.webp';
    await image.decode();
  });
  for (const width of [390, 768, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    const section = page.getByRole('region', { name: 'Parceiro oficial', exact: true });
    await section.scrollIntoViewIfNeeded();
    const geometry = await section.evaluate(element => {
      const word = element.querySelector('[class*="partnerWordmark"] > span');
      const copy = element.querySelector('[class*="partnerCopy"]');
      const range = document.createRange();
      range.selectNodeContents(word);
      return { wordRight: range.getBoundingClientRect().right, divider: copy.getBoundingClientRect().left, headingHeight: copy.querySelector('h2').getBoundingClientRect().height };
    });
    if (width >= 1440) {
      assert.ok(geometry.wordRight < geometry.divider - 16, JSON.stringify(geometry));
      assert.ok(geometry.headingHeight < 100, JSON.stringify(geometry));
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await section.screenshot({ path: `artifacts/partner-reference/partner-fixed-${width}.png` });
    console.log(`${width}: no overlap or overflow; heading proportions preserved`);
  }
  await browser.close();
})().catch(error => { console.error(error.message); process.exit(1); });
