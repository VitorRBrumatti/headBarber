import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/app/booking/[slug]/booking-client.tsx'),
  'utf8',
)

describe('booking wizard contract', () => {
  it('uses the approved seven-step order', () => {
    const labels = [
      'Serviço',
      'Profissional',
      'Adicionais',
      'Produtos',
      'Data e Hora',
      'Dados',
      'Confirmação',
    ]

    labels.forEach((label) => expect(source).toContain(`name: '${label}'`))
  })

  it('submits selected products and returns stock conflicts to step four', () => {
    expect(source).toContain('products: toSelectedProducts(selectedProducts)')
    expect(source).toContain("response.code === 'INSUFFICIENT_STOCK'")
    expect(source).toContain('setCurrentStep(4)')
  })

  it('preserves current booking rules', () => {
    expect(source).toContain('getPublicSlotsAction')
    expect(source).toContain('createPublicBooking')
    expect(source).toContain('Nome e celular são obrigatórios.')
    expect(source).toContain("selectedBarber === 'any'")
  })
})
