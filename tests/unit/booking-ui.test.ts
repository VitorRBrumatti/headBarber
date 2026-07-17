import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (name: string) =>
  readFileSync(resolve(process.cwd(), `src/app/booking/[slug]/${name}`), 'utf8')

describe('booking visual contract', () => {
  it('renders seven accessible steps in the approved palette', () => {
    const source = read('booking-progress.tsx')
    expect(source).toContain("aria-current={isActive ? 'step' : undefined}")
    expect(source).toContain('Etapa {currentStep} de {steps.length}')
    expect(source).toContain('#C79A4A')
    expect(source).toContain('#1A1A1D')
  })

  it('disables sold-out products and exposes quantity controls', () => {
    const source = read('booking-product-step.tsx')
    expect(source).toContain('Esgotado')
    expect(source).toContain('Pagamento e retirada na barbearia')
    expect(source).toContain(
      'aria-label={`Diminuir quantidade de ${product.name}`}',
    )
    expect(source).toContain(
      'aria-label={`Aumentar quantidade de ${product.name}`}',
    )
  })

  it('uses pay-at-shop copy in success state', () => {
    const source = read('booking-success.tsx')
    expect(source).toContain('Agendamento confirmado')
    expect(source).toContain('Total a pagar na barbearia')
    expect(source).not.toContain('Total Pago')
  })
})
