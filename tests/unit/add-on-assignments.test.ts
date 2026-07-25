import { describe, expect, it } from 'vitest'
import {
  formatAddOnDurationRange,
  formatAddOnPriceRange,
  parseAddOnFormData,
} from '@/app/dashboard/adicionais/add-on-validation'

const allowedBarberIds = new Set(['barber-a', 'barber-b'])
const assignment = {
  barberId: 'barber-a',
  price: 10,
  durationMinutes: 0,
  isAvailable: true,
}

function makeFormData(
  assignments: unknown,
  overrides: Record<string, string> = {},
) {
  const formData = new FormData()
  formData.set('name', overrides.name ?? 'Sobrancelha')
  formData.set('is_active', overrides.is_active ?? 'true')
  formData.set('assignments', JSON.stringify(assignments))
  return formData
}

describe('add-on assignment validation', () => {
  it('accepts distinct values per barber', () => {
    expect(
      parseAddOnFormData(
        makeFormData([
          assignment,
          {
            barberId: 'barber-b',
            price: 15,
            durationMinutes: 10,
            isAvailable: true,
          },
        ]),
        allowedBarberIds,
        'create',
      ),
    ).toEqual({
      success: true,
      data: {
        name: 'Sobrancelha',
        isActive: true,
        assignments: [
          assignment,
          {
            barberId: 'barber-b',
            price: 15,
            durationMinutes: 10,
            isAvailable: true,
          },
        ],
      },
    })
  })

  it('requires an available barber only when creating', () => {
    const unavailable = [{ ...assignment, isAvailable: false }]
    expect(
      parseAddOnFormData(
        makeFormData(unavailable),
        allowedBarberIds,
        'create',
      ),
    ).toMatchObject({
      success: false,
      errors: { assignments: expect.stringContaining('ao menos um') },
    })
    expect(
      parseAddOnFormData(
        makeFormData(unavailable),
        allowedBarberIds,
        'edit',
      ).success,
    ).toBe(true)
  })

  it('rejects duplicate and foreign barber ids', () => {
    expect(
      parseAddOnFormData(
        makeFormData([assignment, assignment]),
        allowedBarberIds,
        'edit',
      ),
    ).toMatchObject({
      success: false,
      errors: { assignments: expect.stringContaining('duplicados') },
    })
    expect(
      parseAddOnFormData(
        makeFormData([{ ...assignment, barberId: 'foreign' }]),
        allowedBarberIds,
        'edit',
      ),
    ).toMatchObject({
      success: false,
      errors: { assignments: expect.stringContaining('não pertence') },
    })
  })

  it('accepts zero price but rejects negative and blank price', () => {
    expect(
      parseAddOnFormData(
        makeFormData([{ ...assignment, price: 0 }]),
        allowedBarberIds,
        'create',
      ).success,
    ).toBe(true)
    for (const price of [-1, '']) {
      expect(
        parseAddOnFormData(
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

  it('accepts duration boundaries and rejects fractions and overflow', () => {
    for (const durationMinutes of [0, 720]) {
      expect(
        parseAddOnFormData(
          makeFormData([{ ...assignment, durationMinutes }]),
          allowedBarberIds,
          'create',
        ).success,
      ).toBe(true)
    }
    for (const durationMinutes of [-1, 1.5, 721, '']) {
      expect(
        parseAddOnFormData(
          makeFormData([{ ...assignment, durationMinutes }]),
          allowedBarberIds,
          'create',
        ),
      ).toMatchObject({
        success: false,
        errors: {
          'assignments.barber-a.durationMinutes': expect.stringContaining(
            '0 e 720',
          ),
        },
      })
    }
  })

  it('formats only available assignment ranges', () => {
    const assignments = [
      assignment,
      {
        barberId: 'barber-b',
        price: 15,
        durationMinutes: 10,
        isAvailable: true,
      },
    ]
    expect(formatAddOnPriceRange(assignments)).toBe('R$ 10,00 – R$ 15,00')
    expect(formatAddOnDurationRange(assignments)).toBe('0–10 min')
    expect(
      formatAddOnPriceRange(
        assignments.map((item) => ({ ...item, isAvailable: false })),
      ),
    ).toBe('Sem profissionais')
  })
})
