const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:3002/');
    await page.evaluate(() => document.fonts.ready);
    const section = page.getByRole('region', { name: 'Parceiro oficial', exact: true });
    await section.scrollIntoViewIfNeeded();
    await section.locator('img').evaluate(image => image.decode());
    await section.screenshot({ path: `artifacts/partner-reference/partner-${width}.png` });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Overflow at ${width}`);
    console.log(`${width}: image loaded, no overflow`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('No page errors');
  await browser.close();
})();
