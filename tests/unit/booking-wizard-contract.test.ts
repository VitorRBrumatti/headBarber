import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/app/booking/[slug]/booking-client.tsx'),
  'utf8',
)

describe('booking wizard contract', () => {
  it('uses the approved barber-first seven-step order', () => {
    const labels = [
      'Profissional',
      'Serviço',
      'Adicionais',
      'Produtos',
      'Data e Hora',
      'Dados',
      'Confirmação',
    ]

    const positions = labels.map((label) =>
      source.indexOf(`name: '${label}'`),
    )
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(source).not.toContain("selectedBarber === 'any'")
    expect(source).not.toContain('Qualquer profissional')
  })

  it('loads scoped services with stale-request protection and recovery states', () => {
    expect(source).toContain('getBarberServicesAction')
    expect(source).toContain('serviceRequestRef')
    expect(source).toContain('requestId !== serviceRequestRef.current')
    expect(source).toContain('Carregando serviços')
    expect(source).toContain('Tentar novamente')
    expect(source).toContain('não possui serviços disponíveis')
  })

  it('clears dependent choices when barber or service changes', () => {
    expect(source).toContain("setSelectedServiceId('')")
    expect(source).toContain("setSelectedDate('')")
    expect(source).toContain("setSelectedTime('')")
    expect(source).toContain('setSlots([])')
  })

  it('uses service-aware slots and structured conflict recovery', () => {
    expect(source).toContain('getPublicSlotsAction')
    expect(source).toContain("response.code === 'CONFIG_CHANGED'")
    expect(source).toContain("response.code === 'INVALID_BARBER_SERVICE'")
    expect(source).toContain("response.code === 'SLOT_UNAVAILABLE'")
    expect(source).toContain("response.code === 'INSUFFICIENT_STOCK'")
    expect(source).toContain('setCurrentStep(4)')
  })

  it('renders success using only the authoritative receipt', () => {
    const successCall = source.match(/<BookingSuccess[\s\S]*?\/>/)?.[0] ?? ''
    expect(successCall).toContain('receipt={receipt}')
    expect(successCall).not.toContain('selectedDate={selectedDate}')
    expect(successCall).not.toContain('selectedTime={selectedTime}')
    expect(successCall).not.toContain('serviceSubtotal')
    expect(successCall).not.toContain('productSubtotal')
    expect(successCall).not.toContain('total={totals.total}')
  })
})
