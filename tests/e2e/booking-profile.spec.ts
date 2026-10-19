import { expect, test } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  executeLocalSql,
  loginOwner,
  seedBookingFixture,
} from './barber-service-fixture'

test('owner saves public images and address; booking shows them and keeps date selection functional', async ({
  page,
  baseURL,
}) => {
  test.setTimeout(60_000)
  const fixture = await seedBookingFixture()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const address = 'Av. Brasil, 1024, Centro, Maringá - PR'
  let uploads = 0
  let uploadPending = false
  let releaseUpload: () => void = () => {}
  await page.route('**/api/images/upload', async (route) => {
    uploads++
    uploadPending = true
    await new Promise<void>((resolve) => {
      releaseUpload = resolve
    })
    uploadPending = false
    await route.fulfill({
      json: {
        url: `https://i.ibb.co/public-profile-test/${uploads === 1 ? 'banner' : 'avatar'}.png`,
      },
    })
  })
  await page.route('https://i.ibb.co/public-profile-test/**', (route) =>
    route.fulfill({
      path: 'public/brand/barbershop-hero.png',
      contentType: 'image/png',
    }),
  )
  await loginOwner(page, fixture)
  await page.goto('/dashboard/configuracoes')
  await page.getByRole('tab', { name: 'Perfil público' }).click()
  await expect(
    page.getByRole('tab', { name: 'Perfil público' }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Perfil público' }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(
    page.getByRole('tab', { name: 'Bloqueios Excepcionais' }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Perfil público' }),
  ).toHaveAttribute('aria-selected', 'true')
  await page
    .getByLabel('Banner da barbearia', { exact: true })
    .setInputFiles('public/brand/barbershop-hero.png')
  await expect(
    page.getByRole('button', { name: 'Salvar perfil público' }),
  ).toBeDisabled()
  await expect.poll(() => uploadPending).toBe(true)
  releaseUpload()
  await expect(page.getByRole('button', { name: 'Trocar imagem' })).toHaveCount(
    1,
  )
  await page
    .getByLabel('Foto de perfil da barbearia', { exact: true })
    .setInputFiles(
      'public/brand/headbarber_simbolo_duas_cores_transparente.png',
    )
  await expect(
    page.getByRole('button', { name: 'Salvar perfil público' }),
  ).toBeDisabled()
  await expect.poll(() => uploadPending).toBe(true)
  releaseUpload()
  await expect(page.getByRole('button', { name: 'Trocar imagem' })).toHaveCount(
    2,
  )
  await page.getByLabel('Endereço completo').fill(address)
  await expect(
    page.getByRole('link', { name: /Conferir no Google Maps/ }),
  ).toHaveAttribute(
    'href',
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
  )
  await page.getByRole('button', { name: 'Salvar perfil público' }).click()
  await expect(page.getByRole('status')).toHaveText('Perfil público salvo.')
  expect(uploads).toBe(2)
  await page.reload()
  await page.getByRole('tab', { name: 'Perfil público' }).click()
  await expect(page.getByLabel('Endereço completo')).toHaveValue(address)
  await expect(page.getByRole('button', { name: 'Trocar imagem' })).toHaveCount(
    2,
  )
  expect(
    executeLocalSql(
      `select booking_address from public.barbershops where id='${fixture.barbershopId}'`,
    ),
  ).toBe(address)

  mkdirSync('artifacts/booking-profile', { recursive: true })
  await page.addStyleTag({
    content: 'nextjs-portal { display: none!important; }',
  })
  await page.evaluate(() => scrollTo(0, 0))
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.screenshot({
      path: `artifacts/booking-profile/settings-${width}.png`,
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
  executeLocalSql(
    `update public.barbers set avatar_url='https://i.ibb.co/public-profile-test/barber.png' where barbershop_id='${fixture.barbershopId}'`,
  )
  // Public view must work after signing out: use a separate browser context.
  const publicContext = await page.context().browser()!.newContext({ baseURL })
  const publicPage = await publicContext.newPage()
  publicPage.on('pageerror', (error) => errors.push(error.message))
  await publicPage.route('https://i.ibb.co/public-profile-test/**', (route) =>
    route.fulfill({
      path: 'public/brand/barbershop-hero.png',
      contentType: 'image/png',
    }),
  )
  for (const width of [1440, 768, 390]) {
    await publicPage.setViewportSize({ width, height: 1000 })
    await publicPage.goto(`/booking/${fixture.slug}`)
    await expect(
      publicPage.getByRole('heading', { level: 1, name: /Barbearia E2E/ }),
    ).toBeVisible()
    await expect(
      publicPage.getByRole('img', { name: /Ambiente da/ }),
    ).toBeVisible()
    await expect(
      publicPage.getByRole('img', { name: /Foto de perfil da/ }),
    ).toBeVisible()
    await expect(
      publicPage.getByRole('img', {
        name: fixture.barberNames[1],
        exact: true,
      }),
    ).toBeVisible()
    await expect
      .poll(() =>
        publicPage
          .locator('img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true)
    await expect(
      publicPage.getByRole('link', { name: /Abrir no Google Maps/ }),
    ).toHaveAttribute('target', '_blank')
    await expect(
      publicPage.getByRole('link', { name: /Abrir no Google Maps/ }),
    ).toHaveAttribute(
      'href',
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    )
    await publicPage.addStyleTag({
      content: 'nextjs-portal { display: none!important; }',
    })
    await publicPage.screenshot({
      path: `artifacts/booking-profile/step-1-${width}.png`,
      fullPage: true,
    })
    expect(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await publicPage
      .getByRole('button', { name: new RegExp(fixture.barberNames[1]) })
      .click()
    await publicPage.getByRole('button', { name: 'Continuar', exact: true }).click()
    await publicPage
      .getByRole('button', { name: new RegExp(fixture.serviceName) })
      .click()
    await publicPage.getByRole('button', { name: /Avançar/ }).click()
    await publicPage.getByRole('button', { name: /Avançar/ }).click()
    await publicPage
      .getByRole('button', { name: /Continuar sem produtos/ })
      .click()
    await expect(publicPage.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '5',
    )
    const dayLabels = await publicPage
      .getByRole('group', { name: 'Escolha a data' })
      .getByRole('button')
      .allTextContents()
    expect(dayLabels.every((label) => !/\bde\b/.test(label))).toBe(true)
    await publicPage.locator('main section button').nth(1).click()
    const slot = publicPage.getByRole('button', { name: '09:00', exact: true })
    await slot.click()
    await expect(slot).toHaveAttribute('aria-pressed', 'true')
    await expect(slot).toHaveCSS('background-color', 'rgb(214, 180, 117)')
    await publicPage.screenshot({
      path: `artifacts/booking-profile/step-5-${width}.png`,
      fullPage: true,
    })
    expect(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await publicPage.getByRole('button', { name: /Avançar/ }).click()
    await expect(publicPage.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '6',
    )
  }
  await page.getByRole('button', { name: 'Remover imagem' }).first().click()
  await page.getByRole('button', { name: 'Remover imagem' }).first().click()
  await page.getByLabel('Endereço completo').fill('')
  await page.getByRole('button', { name: 'Salvar perfil público' }).click()
  await expect(page.getByRole('status')).toHaveText('Perfil público salvo.')
  await publicPage.reload()
  await expect(
    publicPage.getByRole('heading', { level: 1, name: /Barbearia E2E/ }),
  ).toBeVisible()
  await expect(
    publicPage.getByRole('img', { name: /Ambiente da|Foto de perfil da/ }),
  ).toHaveCount(0)
  await expect(publicPage.getByRole('img', { name: 'Imagem padrão da barbearia' })).toBeVisible()
  await expect(publicPage.getByRole('img', { name: /Iniciais de/ })).toHaveText('BE')
  await expect(
    publicPage.getByRole('link', { name: /Abrir no Google Maps/ }),
  ).toHaveCount(0)
  await publicPage.screenshot({
    path: 'artifacts/booking-profile/empty-profile-390.png',
    fullPage: true,
  })
  await publicContext.close()
  expect(errors).toEqual([])
  writeFileSync(
    'artifacts/booking-profile/test-shop.json',
    JSON.stringify({
      slug: fixture.slug,
      name: 'Local E2E profile',
      address,
      uploadsMocked: true,
    }),
  )
})
