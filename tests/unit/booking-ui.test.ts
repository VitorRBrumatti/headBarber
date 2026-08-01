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

  it('renders authoritative receipt fields in the success state', () => {
    const source = read('booking-success.tsx')
    expect(source).toContain('Agendamento confirmado')
    expect(source).toContain('receipt.barberName')
    expect(source).toContain('receipt.serviceName')
    expect(source).toContain('receipt.servicePrice')
    expect(source).toContain('receipt.serviceDurationMinutes')
    expect(source).toContain('receipt.addOnDurationMinutes')
    expect(source).toContain('receipt.addOnTotal')
    expect(source).toContain('receipt.productSubtotal')
    expect(source).toContain('receipt.attendanceTotal')
    expect(source).toContain('receipt.subscriptionCoveredTotal')
    expect(source).toContain('receipt.amountDue')
    expect(source).toContain('Assinatura')
    expect(source).toContain('Coberto')
    expect(source).toContain('A pagar')
    expect(source).toContain('Aguardando disponibilidade')
    expect(source).toContain('receipt.totalAtShop')
    expect(source).toContain('receipt.startAt')
    expect(source).toContain('receipt.endAt')
    expect(source).not.toContain('selectedDate')
    expect(source).not.toContain('productQuantities')
  })
})
