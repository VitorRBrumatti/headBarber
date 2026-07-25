import { expect, test } from '@playwright/test'
import {
  executeLocalSql,
  prepareBookingConfirmation,
  seedBookingFixture,
} from './barber-service-fixture'

test('duas confirmações simultâneas reservam o intervalo uma única vez', async ({
  browser,
}) => {
  const fixture = await seedBookingFixture()
  const firstContext = await browser.newContext()
  const secondContext = await browser.newContext()
  const first = await firstContext.newPage()
  const second = await secondContext.newPage()
  const stamp = Date.now()

  await Promise.all([
    prepareBookingConfirmation(first, fixture, 'Concorrente Um', `1191${stamp}`),
    prepareBookingConfirmation(
      second,
      fixture,
      'Concorrente Dois',
      `1192${stamp}`,
    ),
  ])
  await Promise.all([
    first.getByRole('button', { name: 'Confirmar' }).click(),
    second.getByRole('button', { name: 'Confirmar' }).click(),
  ])

  const outcomes = await Promise.all(
    [first, second].map(async (page) => {
      const success = page.getByRole('heading', {
        name: 'Agendamento confirmado',
      })
      const occupied = page.getByText(
        'Este horário acabou de ficar indisponível. Escolha outro horário.',
      )
      return Promise.race([
        success.waitFor({ state: 'visible' }).then(() => true),
        occupied.waitFor({ state: 'visible' }).then(() => false),
      ])
    }),
  )
  expect(outcomes.filter(Boolean)).toHaveLength(1)

  const count = executeLocalSql(`
    select count(*) from public.appointments
    where barbershop_id='${fixture.barbershopId}'
  `)
  expect(Number(count)).toBe(1)

  await firstContext.close()
  await secondContext.close()
})
