import { describe, expect, it } from 'vitest'
import {
  formatDurationRange,
  formatPriceRange,
  parseServiceFormData,
} from '@/app/dashboard/servicos/service-validation'

const allowedBarberIds = new Set(['barber-a', 'barber-b'])

function makeFormData(
  assignments: unknown,
  overrides: Record<string, string> = {},
) {
  const formData = new FormData()
  formData.set('name', overrides.name ?? 'Corte')
  formData.set('description', overrides.description ?? 'Descrição')
  formData.set('is_active', overrides.is_active ?? 'true')
  formData.set('assignments', JSON.stringify(assignments))
  return formData
}

const assignment = {
  barberId: 'barber-a',
  price: 40,
  durationMinutes: 30,
  isAvailable: true,
}

describe('service assignment validation', () => {
  it('rejects create with zero available assignments', () => {
    const result = parseServiceFormData(
      makeFormData([{ ...assignment, isAvailable: false }]),
      allowedBarberIds,
      'create',
    )
    expect(result).toMatchObject({
      success: false,
      errors: { assignments: expect.stringContaining('ao menos um') },
    })
  })

  it('accepts edit with zero available assignments', () => {
    const result = parseServiceFormData(
      makeFormData([{ ...assignment, isAvailable: false }]),
      allowedBarberIds,
      'edit',
    )
    expect(result.success).toBe(true)
  })

  it('rejects duplicate and foreign barber ids', () => {
    expect(
      parseServiceFormData(
        makeFormData([assignment, assignment]),
        allowedBarberIds,
        'edit',
      ),
    ).toMatchObject({
      success: false,
      errors: { assignments: expect.stringContaining('duplicados') },
    })

    expect(
      parseServiceFormData(
        makeFormData([{ ...assignment, barberId: 'foreign' }]),
        allowedBarberIds,
        'edit',
      ),
    ).toMatchObject({
      success: false,
      errors: { assignments: expect.stringContaining('não pertence') },
    })
  })

  it('accepts zero price but rejects negative and empty prices', () => {
    expect(
      parseServiceFormData(
        makeFormData([{ ...assignment, price: 0 }]),
        allowedBarberIds,
        'create',
      ).success,
    ).toBe(true)

    for (const price of [-1, '']) {
      expect(
        parseServiceFormData(
          makeFormData([{ ...assignment, price }]),
          allowedBarberIds,
          'create',
        ),
      ).toMatchObject({
        success: false,
        errors: {
          'assignments.barber-a.price': expect.stringContaining('preço'),
        },
      })
    }
  })

  it('accepts duration boundaries and rejects values outside 5 to 720', () => {
    for (const durationMinutes of [5, 720]) {
      expect(
        parseServiceFormData(
          makeFormData([{ ...assignment, durationMinutes }]),
          allowedBarberIds,
          'create',
        ).success,
      ).toBe(true)
    }

    for (const durationMinutes of [4, 721]) {
      expect(
        parseServiceFormData(
          makeFormData([{ ...assignment, durationMinutes }]),
          allowedBarberIds,
          'create',
        ),
      ).toMatchObject({
        success: false,
        errors: {
          'assignments.barber-a.durationMinutes': expect.stringContaining(
            '5 e 720',
          ),
        },
      })
    }
  })

  it('formats available price and duration ranges', () => {
    const assignments = [
      assignment,
      {
        ...assignment,
        barberId: 'barber-b',
        price: 50,
        durationMinutes: 45,
      },
    ]
    expect(formatPriceRange(assignments)).toBe('R$ 40,00 – R$ 50,00')
    expect(formatDurationRange(assignments)).toBe('30–45 min')
    expect(
      formatPriceRange(
        assignments.map((item) => ({ ...item, isAvailable: false })),
      ),
    ).toBe('Sem profissionais')
  })
})
