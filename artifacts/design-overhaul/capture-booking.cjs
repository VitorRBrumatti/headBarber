const { chromium } = require('@playwright/test')
const sharp = require('sharp')
const assert = require('node:assert/strict')
const base = process.env.CAPTURE_URL || 'http://localhost:3000'
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(`${base}/booking/headbarber-demo`, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.screenshot({ path: 'public/brand/product/booking-1.png' })
  await page.getByRole('button', { name: /Lucas Rocha/ }).click()
  await page.getByRole('button', { name: /Avançar/i }).click()
  await page.getByRole('button', { name: /Corte tradicional/ }).waitFor()
  await page.screenshot({ path: 'public/brand/product/booking-2.png' })
  await page.getByRole('button', { name: /Corte tradicional/ }).click()
  await page.getByRole('button', { name: /Avançar/i }).click()
  for (let step = 3; step < 5; step++) {
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), String(step))
    await page.getByRole('button', { name: /Avançar/i }).click()
  }
  assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '5')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'public/brand/product/booking-3.png' })
  for (const name of ['agenda', 'overview', 'finance', 'booking-1', 'booking-2', 'booking-3']) {
    await sharp(`public/brand/product/${name}.png`).webp({ quality: 85 }).toFile(`public/brand/product/${name}.webp`)
  }
  await browser.close()
  console.log('Real booking captures, seven-step progress assertions and WebP conversion complete; no booking submitted.')
})().catch(error => { console.error(error.message); process.exit(1) })
