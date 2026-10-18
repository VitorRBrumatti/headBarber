const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch();
  for (const reducedMotion of ['no-preference', 'reduce']) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://127.0.0.1:3002/');
      await page.waitForTimeout(200);
      const feature = page.locator('#recursos article').first();
      const initial = await feature.evaluate(element => Number(getComputedStyle(element).opacity));
      assert.equal(initial, reducedMotion === 'reduce' ? 1 : 0);
      await page.locator('#recursos').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1300);
      assert.equal(await feature.evaluate(element => Number(getComputedStyle(element).opacity)), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarColor), 'rgb(199, 154, 74) rgb(12, 13, 13)');
      await page.screenshot({ path: `artifacts/partner-reference/motion-${width}-${reducedMotion}.png` });
      await page.locator('#precos').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1300);
      assert.equal(await page.locator('#precos article').first().evaluate(element => Number(getComputedStyle(element).opacity)), 1);
      assert.deepEqual(errors, []);
      console.log(`${width}/${reducedMotion}: reveal, pricing, scrollbar, overflow and page errors passed`);
      await page.close();
    }
  }
  await browser.close();
})();
