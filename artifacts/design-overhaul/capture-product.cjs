const { chromium } = require('@playwright/test')
const fs = require('node:fs')
const base = process.env.CAPTURE_URL || 'http://127.0.0.1:3000'

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
  await page.goto(`${base}/demo`)
  await page.locator('form[action="/auth/demo"] button').click()
  await page.waitForURL(/dashboard|error=/)
  if (!page.url().includes('/dashboard')) throw new Error('Official demo unavailable')
  fs.mkdirSync('public/brand/product', { recursive: true })
  for (const [name, route] of [['agenda', 'agenda'], ['overview', ''], ['finance', 'financeiro']]) {
    await page.goto(`${base}/dashboard/${route}`, { waitUntil: 'networkidle' })
    if (!new URL(page.url()).pathname.replace(/\/$/, '').endsWith(`/dashboard${route ? `/${route}` : ''}`)) throw new Error(`Capture redirected: ${name}`)
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
    await page.screenshot({ path: `public/brand/product/${name}.png` })
    console.log(`Captured ${name}: ${await page.title()}`)
  }
  await browser.close()
})().catch(error => { console.error(error.message); process.exit(1) })
